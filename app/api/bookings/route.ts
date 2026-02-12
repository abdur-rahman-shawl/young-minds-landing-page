import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  sessions,
  notifications,
  mentors,
  users,
  mentorAvailabilitySchedules,
  mentorWeeklyPatterns,
  mentorAvailabilityExceptions
} from '@/lib/db/schema';
import { eq, and, desc, gte, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { createBookingSchema, validateBookingTime, canUserAccessBooking } from '@/lib/validations/booking';
import { bookingRateLimit, RateLimitError } from '@/lib/rate-limit';
import { getDay, isWithinInterval, addMinutes, setHours, setMinutes, setSeconds } from 'date-fns';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { getPlanFeatures } from '@/lib/subscriptions/enforcement';
import { sendBookingConfirmedEmail, sendNewBookingAlertEmail } from '@/lib/email';
import {
  consumeFeature,
  enforceFeature,
  isSubscriptionPolicyError,
} from '@/lib/subscriptions/policy-runtime';
import { ACTION_POLICIES, resolveMenteeBookingAction } from '@/lib/subscriptions/policies';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { requireMentee } from '@/lib/api/guards';

// Remove duplicate schema definition since it's imported

// POST /api/bookings - Create new booking
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    bookingRateLimit.check(req);

    const guard = await requireMentee(req, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

    const body = await req.json();
    const validatedData = createBookingSchema.parse(body);

    // Additional business logic validation
    const scheduledAt = new Date(validatedData.scheduledAt);
    const timeErrors = validateBookingTime(scheduledAt, validatedData.duration);

    if (timeErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid booking time', details: timeErrors },
        { status: 400 }
      );
    }

    // Prevent self-booking
    if (validatedData.mentorId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot book a session with yourself' },
        { status: 400 }
      );
    }

    const menteeSessionAction = resolveMenteeBookingAction(validatedData.sessionType);
    const menteeSessionFeatureKey = ACTION_POLICIES[menteeSessionAction].featureKey;

    const bookingSource = (body?.bookingSource || 'default') as string;
    const isAiBooking = bookingSource === 'ai';
    let aiSpecialRate: number | null = null;
    let mentorSessionFeatureAction: 'mentor.free_session_availability' | 'mentor.paid_session_availability' | null =
      null;

    if (isAiBooking) {
      try {
        await enforceFeature({
          action: menteeSessionAction,
          userId: session.user.id,
          failureMessage: 'You have reached your session limit for this type',
        });
      } catch (error) {
        if (isSubscriptionPolicyError(error)) {
          return NextResponse.json(error.payload, { status: error.status });
        }
        console.error('Subscription check failed (mentee):', error);
        return NextResponse.json(
          { error: 'Unable to verify mentee subscription limits' },
          { status: 500 }
        );
      }

      const visibilityAccess = await enforceFeature({
        action: 'mentor.ai.visibility',
        userId: validatedData.mentorId,
        failureMessage: 'Mentor AI visibility is not included in their plan',
      }).catch((error) => {
        if (isSubscriptionPolicyError(error)) {
          return null;
        }
        throw error;
      });

      if (!visibilityAccess?.has_access) {
        return NextResponse.json(
          { error: 'Mentor is not visible to AI search' },
          { status: 403 }
        );
      }

      mentorSessionFeatureAction =
        validatedData.sessionType === 'FREE'
          ? 'mentor.free_session_availability'
          : 'mentor.paid_session_availability';

      const mentorSessionAccess = await enforceFeature({
        action: mentorSessionFeatureAction,
        userId: validatedData.mentorId,
        failureMessage: 'Mentor has reached their session limit',
      }).catch((error) => {
        if (isSubscriptionPolicyError(error)) {
          return null;
        }
        throw error;
      });

      if (!mentorSessionAccess?.has_access) {
        return NextResponse.json(
          { error: 'Mentor has no session availability' },
          { status: 403 }
        );
      }

      if (validatedData.sessionType === 'PAID') {
        try {
          const menteeFeatures = await getPlanFeatures(session.user.id, {
            audience: 'mentee',
            actorRole: 'mentee',
          });
          const paidVideoFeature = menteeFeatures.find(
            feature => feature.feature_key === FEATURE_KEYS.PAID_VIDEO_SESSIONS_MONTHLY
          );
          const paidVideoPlanRate = paidVideoFeature?.limit_amount ?? null;
          if (
            paidVideoPlanRate !== null &&
            !Number.isNaN(paidVideoPlanRate) &&
            paidVideoPlanRate > 0
          ) {
            aiSpecialRate = paidVideoPlanRate;
          }
        } catch (error) {
          console.error('Failed to load plan features for AI rate:', error);
        }
      }
    }

    // Verify mentor exists and is available
    const mentor = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, validatedData.mentorId))
      .limit(1);

    if (!mentor.length || !mentor[0].isAvailable) {
      return NextResponse.json(
        { error: 'Mentor not found or not available' },
        { status: 404 }
      );
    }

    // Check mentor's availability settings
    const availabilitySchedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (!availabilitySchedule.length || !availabilitySchedule[0].isActive) {
      return NextResponse.json(
        { error: 'Mentor has not set up availability' },
        { status: 400 }
      );
    }

    const schedule = availabilitySchedule[0];

    // Check if booking is within advance booking window
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + schedule.minAdvanceBookingHours * 60 * 60 * 1000);
    const maxBookingTime = new Date(now.getTime() + schedule.maxAdvanceBookingDays * 24 * 60 * 60 * 1000);

    if (scheduledAt < minBookingTime) {
      return NextResponse.json(
        { error: `Bookings must be made at least ${schedule.minAdvanceBookingHours} hours in advance` },
        { status: 400 }
      );
    }

    if (scheduledAt > maxBookingTime) {
      return NextResponse.json(
        { error: `Bookings cannot be made more than ${schedule.maxAdvanceBookingDays} days in advance` },
        { status: 400 }
      );
    }

    // Check weekly patterns
    const dayOfWeek = getDay(scheduledAt);
    const weeklyPattern = await db
      .select()
      .from(mentorWeeklyPatterns)
      .where(
        and(
          eq(mentorWeeklyPatterns.scheduleId, schedule.id),
          eq(mentorWeeklyPatterns.dayOfWeek, dayOfWeek)
        )
      )
      .limit(1);

    if (!weeklyPattern.length || !weeklyPattern[0].isEnabled) {
      return NextResponse.json(
        { error: 'Mentor is not available on this day' },
        { status: 400 }
      );
    }

    // Check if time falls within available time blocks
    const timeBlocks = weeklyPattern[0].timeBlocks as any[];
    const bookingHour = scheduledAt.getHours();
    const bookingMinute = scheduledAt.getMinutes();
    const bookingTimeStr = `${bookingHour.toString().padStart(2, '0')}:${bookingMinute.toString().padStart(2, '0')}`;

    let isInAvailableBlock = false;
    for (const block of timeBlocks) {
      if (block.type === 'AVAILABLE') {
        const blockStart = block.startTime;
        const blockEnd = block.endTime;

        // Check if booking time falls within this block
        if (bookingTimeStr >= blockStart && bookingTimeStr < blockEnd) {
          // Also check if the entire session fits within the block
          const sessionEndTime = addMinutes(scheduledAt, validatedData.duration);
          const sessionEndHour = sessionEndTime.getHours();
          const sessionEndMinute = sessionEndTime.getMinutes();
          const sessionEndStr = `${sessionEndHour.toString().padStart(2, '0')}:${sessionEndMinute.toString().padStart(2, '0')}`;

          if (sessionEndStr <= blockEnd) {
            isInAvailableBlock = true;
            break;
          }
        }
      }
    }

    if (!isInAvailableBlock) {
      return NextResponse.json(
        { error: 'This time slot is not within mentor\'s available hours' },
        { status: 400 }
      );
    }

    // Check for exceptions (holidays, vacation, etc.)
    const exceptions = await db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(
        and(
          eq(mentorAvailabilityExceptions.scheduleId, schedule.id),
          lte(mentorAvailabilityExceptions.startDate, scheduledAt),
          gte(mentorAvailabilityExceptions.endDate, scheduledAt)
        )
      );

    if (exceptions.length > 0) {
      const blockingException = exceptions.find(exc => exc.type === 'UNAVAILABLE');
      if (blockingException) {
        return NextResponse.json(
          { error: `Mentor is unavailable: ${blockingException.reason || 'Time off'}` },
          { status: 400 }
        );
      }
    }

    // Check for booking conflicts with buffer time
    const bufferTime = schedule.bufferTimeBetweenSessions || 0;
    const newBookingStart = scheduledAt;
    const newBookingEnd = addMinutes(newBookingStart, validatedData.duration);

    // Fetch potentially conflicting bookings that are scheduled
    const potentialConflicts = await db
      .select({
        scheduledAt: sessions.scheduledAt,
        duration: sessions.duration,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.mentorId, validatedData.mentorId),
          eq(sessions.status, 'scheduled')
        )
      );

    // Perform conflict check in code for accuracy
    for (const existingBooking of potentialConflicts) {
      const existingBookingStart = new Date(existingBooking.scheduledAt);
      const existingBookingEnd = addMinutes(existingBookingStart, existingBooking.duration);

      // Apply buffer to the existing booking for the check
      const existingStartWithBuffer = new Date(existingBookingStart.getTime() - bufferTime * 60 * 1000);
      const existingEndWithBuffer = new Date(existingBookingEnd.getTime() + bufferTime * 60 * 1000);

      // Standard interval overlap check: (StartA < EndB) and (EndA > StartB)
      if (newBookingStart < existingEndWithBuffer && newBookingEnd > existingStartWithBuffer) {
        return NextResponse.json(
          { error: 'This time slot conflicts with another booking' },
          { status: 409 }
        );
      }
    }

    // Create the booking
    const mentorBaseRate = mentor[0].hourlyRate ? Number(mentor[0].hourlyRate) : 0;
    const sessionRate =
      isAiBooking &&
      validatedData.sessionType === 'PAID' &&
      aiSpecialRate !== null
        ? aiSpecialRate
        : mentorBaseRate;

    const [newBooking] = await db
      .insert(sessions)
      .values({
        mentorId: validatedData.mentorId,
        menteeId: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        sessionType: validatedData.sessionType,
        bookingSource,
        scheduledAt: new Date(validatedData.scheduledAt),
        duration: validatedData.duration,
        meetingType: validatedData.meetingType,
        location: validatedData.location,
        status: 'scheduled',
        rate: sessionRate,
        currency: mentor[0].currency || 'USD',
      })
      .returning();

    if (isAiBooking && mentorSessionFeatureAction) {
      try {
        await consumeFeature({
          action: menteeSessionAction,
          userId: session.user.id,
          delta: { count: 1, minutes: validatedData.duration },
          resourceType: 'session',
          resourceId: newBooking.id,
        });

        await consumeFeature({
          action: mentorSessionFeatureAction,
          userId: validatedData.mentorId,
          delta: { count: 1, minutes: validatedData.duration },
          resourceType: 'session',
          resourceId: newBooking.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('No active mentor subscription')) {
          console.warn('Usage tracking warning (mentor lacks subscription):', message);
        } else {
          console.error('Usage tracking failed:', error);
          return NextResponse.json(
            { error: 'Failed to track session usage' },
            { status: 500 }
          );
        }
      }
    }

    // Create notification for mentor
    await db.insert(notifications).values({
      userId: validatedData.mentorId,
      type: 'BOOKING_REQUEST',
      title: 'New Session Booked!',
      message: `${session.user.name || 'A mentee'} has booked a session with you for ${validatedData.title}`,
      relatedId: newBooking.id,
      relatedType: 'session',
      actionUrl: `/dashboard?section=schedule`,
      actionText: 'View Schedule',
    });

    // Create notification for mentee
    await db.insert(notifications).values({
      userId: session.user.id,
      type: 'BOOKING_CONFIRMED',
      title: 'Session Booking Confirmed',
      message: `Your session "${validatedData.title}" has been scheduled successfully`,
      relatedId: newBooking.id,
      relatedType: 'session',
      actionUrl: `/dashboard?section=sessions`,
      actionText: 'View Sessions',
    });

    // Send booking confirmation emails
    const bookingEmailData = {
      sessionId: newBooking.id,
      sessionTitle: validatedData.title,
      scheduledAt: scheduledAt,
      duration: validatedData.duration,
      meetingType: validatedData.meetingType as 'video' | 'audio' | 'chat',
    };

    // Fetch mentor email data first (needed for both emails)
    const mentorEmailData = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, validatedData.mentorId))
      .limit(1);

    const mentorNameForEmail = mentorEmailData[0]?.name || 'Your Mentor';

    // Email to mentee (booking confirmed)
    const menteeData = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (menteeData[0]?.email) {
      await sendBookingConfirmedEmail(
        menteeData[0].email,
        menteeData[0].name || 'Mentee',
        mentorNameForEmail,
        bookingEmailData
      );
    }

    // Email to mentor (new booking alert)
    if (mentorEmailData[0]?.email) {
      await sendNewBookingAlertEmail(
        mentorEmailData[0].email,
        mentorEmailData[0].name || 'Mentor',
        session.user.name || 'A Mentee',
        bookingEmailData
      );
    }

    // ========================================================================
    // CREATE LIVEKIT ROOM FOR THE SESSION
    // ========================================================================
    // CRITICAL: Room creation must succeed for video calling to work
    // If this fails, the booking is still valid but video call won't be available
    try {
      console.log(`📹 Creating LiveKit room for session ${newBooking.id}`);

      const { roomId, roomName, meetingUrl } = await LiveKitRoomManager.createRoomForSession(
        newBooking.id
      );

      // Update session with meeting URL
      await db
        .update(sessions)
        .set({ meetingUrl })
        .where(eq(sessions.id, newBooking.id));

      console.log(
        `✅ LiveKit room created successfully: ${roomName} (${roomId}) for session ${newBooking.id}`
      );
    } catch (roomError) {
      // FAIL LOUDLY - Log critical error but don't fail the booking
      // Booking is successful even if room creation fails
      // This allows manual intervention to create room later
      console.error(
        '❌ CRITICAL ERROR: Failed to create LiveKit room for session',
        {
          sessionId: newBooking.id,
          error: roomError instanceof Error ? roomError.message : 'Unknown error',
          stack: roomError instanceof Error ? roomError.stack : undefined,
        }
      );

      // TODO: Send alert to system administrators
      // TODO: Create a system notification for manual room creation
      // For now, log this as a critical issue requiring immediate attention
      console.error(
        '🚨 MANUAL INTERVENTION REQUIRED: LiveKit room creation failed for session',
        newBooking.id
      );
    }

    return NextResponse.json({
      success: true,
      booking: newBooking,
      message: 'Session booked successfully!'
    });

  } catch (error) {
    console.error('Booking creation error:', error);

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': error.retryAfter.toString() } }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

// GET /api/bookings - Get user's bookings
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role'); // 'mentor' or 'mentee'
    const status = searchParams.get('status');
    const mentorId = searchParams.get('mentorId'); // For checking a specific mentor's availability
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let whereCondition;

    // If checking a specific mentor's availability (for booking)
    if (mentorId && start && end) {
      const conditions = [eq(sessions.mentorId, mentorId)];

      // Add date range filter
      const startDate = new Date(start);
      const endDate = new Date(end);
      conditions.push(gte(sessions.scheduledAt, startDate));
      conditions.push(lte(sessions.scheduledAt, endDate));

      if (status) {
        conditions.push(eq(sessions.status, status));
      }

      whereCondition = and(...conditions);
    } else if (role === 'mentor') {
      whereCondition = eq(sessions.mentorId, session.user.id);
    } else {
      whereCondition = eq(sessions.menteeId, session.user.id);
    }

    if (status && !mentorId) {
      whereCondition = and(whereCondition, eq(sessions.status, status));
    }

    const bookings = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        description: sessions.description,
        status: sessions.status,
        scheduledAt: sessions.scheduledAt,
        startedAt: sessions.startedAt,
        endedAt: sessions.endedAt,
        duration: sessions.duration,
        meetingType: sessions.meetingType,
        location: sessions.location,
        meetingUrl: sessions.meetingUrl,
        rate: sessions.rate,
        currency: sessions.currency,
        mentorNotes: sessions.mentorNotes,
        menteeNotes: sessions.menteeNotes,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        mentorId: sessions.mentorId,
        menteeId: sessions.menteeId,
        rescheduleCount: sessions.rescheduleCount,
        mentorRescheduleCount: sessions.mentorRescheduleCount,
        cancelledBy: sessions.cancelledBy,
        // Pending reschedule fields
        pendingRescheduleRequestId: sessions.pendingRescheduleRequestId,
        pendingRescheduleTime: sessions.pendingRescheduleTime,
        pendingRescheduleBy: sessions.pendingRescheduleBy,
        // Auto-reassignment fields
        wasReassigned: sessions.wasReassigned,
        reassignedFromMentorId: sessions.reassignedFromMentorId,
        reassignedAt: sessions.reassignedAt,
        reassignmentStatus: sessions.reassignmentStatus,
        // Mentor info (from JOIN with mentors table)
        mentorName: mentors.fullName,
        mentorAvatar: mentors.profileImageUrl,
        // Mentee info (from JOIN with users table)
        menteeName: users.name,
        menteeAvatar: users.image,
      })
      .from(sessions)
      .leftJoin(mentors, eq(sessions.mentorId, mentors.userId))
      .leftJoin(users, eq(sessions.menteeId, users.id))
      .where(whereCondition)
      .orderBy(desc(sessions.scheduledAt));

    return NextResponse.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
