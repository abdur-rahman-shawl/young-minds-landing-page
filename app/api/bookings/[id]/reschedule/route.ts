import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionPolicies, sessionAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';
import { format } from 'date-fns';

const rescheduleBookingSchema = z.object({
  scheduledAt: z.string()
    .datetime('Invalid date format')
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        return date > now;
      },
      'Session must be rescheduled to a future time'
    ),
  duration: z.number()
    .min(15, 'Session must be at least 15 minutes')
    .max(240, 'Session cannot exceed 4 hours')
    .optional(),
});

// Helper to get policy value from DB with fallback
async function getPolicyValue(key: string, defaultValue: string): Promise<string> {
  const policy = await db
    .select()
    .from(sessionPolicies)
    .where(eq(sessionPolicies.policyKey, key))
    .limit(1);

  return policy.length > 0 ? policy[0].policyValue : defaultValue;
}

// POST /api/bookings/[id]/reschedule - Reschedule a booking (MENTOR OR MENTEE)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { scheduledAt, duration } = rescheduleBookingSchema.parse(body);

    // Get the existing booking
    const existingBooking = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!existingBooking.length) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = existingBooking[0];

    // Check if user is mentor or mentee for this session
    const isMentor = booking.mentorId === session.user.id;
    const isMentee = booking.menteeId === session.user.id;

    if (!isMentee && !isMentor) {
      return NextResponse.json(
        { error: 'You are not authorized to reschedule this session.' },
        { status: 403 }
      );
    }

    // Check if booking can be rescheduled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot reschedule a cancelled session' },
        { status: 400 }
      );
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot reschedule a completed session' },
        { status: 400 }
      );
    }

    if (booking.status === 'no_show') {
      return NextResponse.json(
        { error: 'Cannot reschedule a no-show session' },
        { status: 400 }
      );
    }

    if (booking.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot reschedule a session that is in progress' },
        { status: 400 }
      );
    }

    // Load policies from DB based on role
    const rescheduleCutoffHours = isMentor
      ? parseInt(
        await getPolicyValue(
          DEFAULT_SESSION_POLICIES.MENTOR_RESCHEDULE_CUTOFF_HOURS.key,
          DEFAULT_SESSION_POLICIES.MENTOR_RESCHEDULE_CUTOFF_HOURS.value
        )
      )
      : parseInt(
        await getPolicyValue(
          DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.key,
          DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.value
        )
      );

    const maxReschedules = isMentor
      ? parseInt(
        await getPolicyValue(
          DEFAULT_SESSION_POLICIES.MENTOR_MAX_RESCHEDULES_PER_SESSION.key,
          DEFAULT_SESSION_POLICIES.MENTOR_MAX_RESCHEDULES_PER_SESSION.value
        )
      )
      : parseInt(
        await getPolicyValue(
          DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.key,
          DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.value
        )
      );

    // Get the current reschedule count based on role
    const currentRescheduleCount = isMentor
      ? (booking.mentorRescheduleCount ?? 0)
      : booking.rescheduleCount;

    // Check reschedule count limit
    if (currentRescheduleCount >= maxReschedules) {
      const roleLabel = isMentor ? 'mentor' : 'mentee';
      return NextResponse.json(
        {
          error: `This session has already been rescheduled ${maxReschedules} time(s) by the ${roleLabel}. No further rescheduling is allowed.`,
          rescheduleCount: currentRescheduleCount,
          maxReschedules
        },
        { status: 400 }
      );
    }

    // Check rescheduling time constraints
    const oldScheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (oldScheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < rescheduleCutoffHours && hoursUntilSession > 0) {
      const roleLabel = isMentor ? 'Mentors' : 'Mentees';
      return NextResponse.json(
        { error: `${roleLabel} cannot reschedule sessions within ${rescheduleCutoffHours} hour(s) of the scheduled time` },
        { status: 400 }
      );
    }

    const newScheduledTime = new Date(scheduledAt);
    const newRescheduleCount = currentRescheduleCount + 1;
    const rescheduledBy = isMentor ? 'mentor' : 'mentee';

    // Update the booking with new schedule
    const updateData: Record<string, unknown> = {
      scheduledAt: newScheduledTime,
      duration: duration || booking.duration,
      updatedAt: new Date(),
    };

    // Increment the appropriate reschedule counter based on role
    if (isMentor) {
      updateData.mentorRescheduleCount = newRescheduleCount;
    } else {
      updateData.rescheduleCount = newRescheduleCount;
    }

    const [rescheduledBooking] = await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, id))
      .returning();

    // Create audit log entry
    await db.insert(sessionAuditLog).values({
      sessionId: booking.id,
      userId: session.user.id,
      action: 'reschedule',
      previousScheduledAt: oldScheduledTime,
      newScheduledAt: newScheduledTime,
      policySnapshot: {
        rescheduleCutoffHours,
        maxReschedules,
        rescheduleNumber: newRescheduleCount,
        hoursUntilSession: Math.round(hoursUntilSession * 100) / 100,
        rescheduledBy,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Format dates for notification
    const oldDateStr = format(oldScheduledTime, "EEEE, MMMM d 'at' h:mm a");
    const newDateStr = format(newScheduledTime, "EEEE, MMMM d 'at' h:mm a");

    // Notify the other party
    if (isMentor) {
      // Mentor rescheduled → notify mentee
      await db.insert(notifications).values({
        userId: booking.menteeId,
        type: 'BOOKING_RESCHEDULED',
        title: 'Session Rescheduled by Mentor',
        message: `Your session "${booking.title}" has been rescheduled from ${oldDateStr} to ${newDateStr}.`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=sessions`,
        actionText: 'View Sessions',
      });

      // Confirmation to mentor
      await db.insert(notifications).values({
        userId: booking.mentorId,
        type: 'BOOKING_RESCHEDULED',
        title: 'Reschedule Confirmed',
        message: `You have rescheduled "${booking.title}" to ${newDateStr}. (${newRescheduleCount}/${maxReschedules} reschedules used)`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=schedule`,
        actionText: 'View Schedule',
      });
    } else {
      // Mentee rescheduled → notify mentor
      await db.insert(notifications).values({
        userId: booking.mentorId,
        type: 'BOOKING_RESCHEDULED',
        title: 'Session Rescheduled by Mentee',
        message: `Your session "${booking.title}" has been rescheduled from ${oldDateStr} to ${newDateStr}.`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=schedule`,
        actionText: 'View Schedule',
      });

      // Confirmation to mentee
      await db.insert(notifications).values({
        userId: booking.menteeId,
        type: 'BOOKING_RESCHEDULED',
        title: 'Reschedule Confirmed',
        message: `Your session "${booking.title}" has been rescheduled to ${newDateStr}. (${newRescheduleCount}/${maxReschedules} reschedules used)`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=sessions`,
        actionText: 'View Sessions',
      });
    }

    return NextResponse.json({
      success: true,
      booking: rescheduledBooking,
      rescheduleCount: newRescheduleCount,
      maxReschedules,
      rescheduledBy,
      message: 'Session rescheduled successfully'
    });

  } catch (error) {
    console.error('Booking rescheduling error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reschedule booking' },
      { status: 500 }
    );
  }
}