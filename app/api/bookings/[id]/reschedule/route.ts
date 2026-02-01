import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionPolicies, rescheduleRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';
import { format, addHours } from 'date-fns';

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

// POST /api/bookings/[id]/reschedule - Create a reschedule REQUEST (pending approval)
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

    // Check for existing pending reschedule request
    const existingRequest = await db
      .select()
      .from(rescheduleRequests)
      .where(
        and(
          eq(rescheduleRequests.sessionId, id),
          eq(rescheduleRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return NextResponse.json(
        { error: 'There is already a pending reschedule request for this session. Please wait for a response or cancel the existing request.' },
        { status: 400 }
      );
    }

    // Load policies from DB
    const [
      rescheduleCutoffHours,
      mentorRescheduleCutoffHours,
      maxReschedules,
      mentorMaxReschedules,
      expiryHours,
    ] = await Promise.all([
      getPolicyValue(
        DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.key,
        DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.value
      ),
      getPolicyValue(
        DEFAULT_SESSION_POLICIES.MENTOR_RESCHEDULE_CUTOFF_HOURS.key,
        DEFAULT_SESSION_POLICIES.MENTOR_RESCHEDULE_CUTOFF_HOURS.value
      ),
      getPolicyValue(
        DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.key,
        DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.value
      ),
      getPolicyValue(
        DEFAULT_SESSION_POLICIES.MENTOR_MAX_RESCHEDULES_PER_SESSION.key,
        DEFAULT_SESSION_POLICIES.MENTOR_MAX_RESCHEDULES_PER_SESSION.value
      ),
      getPolicyValue(
        DEFAULT_SESSION_POLICIES.RESCHEDULE_REQUEST_EXPIRY_HOURS.key,
        DEFAULT_SESSION_POLICIES.RESCHEDULE_REQUEST_EXPIRY_HOURS.value
      ),
    ]);

    // Get role-specific limits
    const cutoffHours = isMentor ? parseInt(mentorRescheduleCutoffHours) : parseInt(rescheduleCutoffHours);
    const maxAllowed = isMentor ? parseInt(mentorMaxReschedules) : parseInt(maxReschedules);
    const currentCount = isMentor ? (booking.mentorRescheduleCount ?? 0) : booking.rescheduleCount;

    // Check reschedule count limit
    if (currentCount >= maxAllowed) {
      const roleLabel = isMentor ? 'mentor' : 'mentee';
      return NextResponse.json(
        {
          error: `This session has already been rescheduled ${maxAllowed} time(s) by the ${roleLabel}. No further rescheduling is allowed.`,
          rescheduleCount: currentCount,
          maxReschedules: maxAllowed
        },
        { status: 400 }
      );
    }

    // Check rescheduling time constraints
    const oldScheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (oldScheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < cutoffHours && hoursUntilSession > 0) {
      const roleLabel = isMentor ? 'Mentors' : 'Mentees';
      return NextResponse.json(
        { error: `${roleLabel} cannot reschedule sessions within ${cutoffHours} hour(s) of the scheduled time` },
        { status: 400 }
      );
    }

    const proposedTime = new Date(scheduledAt);
    const expiresAt = addHours(now, parseInt(expiryHours));
    const initiatedBy = isMentor ? 'mentor' : 'mentee';

    // Create reschedule request (pending approval)
    const [rescheduleRequest] = await db
      .insert(rescheduleRequests)
      .values({
        sessionId: id,
        initiatedBy,
        initiatorId: session.user.id,
        status: 'pending',
        proposedTime,
        proposedDuration: duration || booking.duration,
        originalTime: oldScheduledTime,
        expiresAt,
      })
      .returning();

    // Update session with pending reschedule info
    await db
      .update(sessions)
      .set({
        pendingRescheduleRequestId: rescheduleRequest.id,
        pendingRescheduleTime: proposedTime,
        pendingRescheduleBy: initiatedBy,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    // Format for notifications
    const newDateStr = format(proposedTime, "EEEE, MMMM d 'at' h:mm a");
    const expiryDateStr = format(expiresAt, "EEEE, MMMM d 'at' h:mm a");

    // Notify the other party
    const recipientId = isMentor ? booking.menteeId : booking.mentorId;
    const initiatorName = isMentor ? 'Your mentor' : 'Your mentee';

    const recipientSection = isMentor ? 'sessions' : 'schedule';

    await db.insert(notifications).values({
      userId: recipientId,
      type: 'RESCHEDULE_REQUEST',
      title: 'Reschedule Request',
      message: `${initiatorName} wants to reschedule "${booking.title}" to ${newDateStr}. Please respond by ${expiryDateStr}.`,
      relatedId: booking.id,
      relatedType: 'session',
      actionUrl: `/dashboard?section=${recipientSection}&action=reschedule-response&sessionId=${booking.id}`,
      actionText: 'Respond Now',
    });

    return NextResponse.json({
      success: true,
      requestId: rescheduleRequest.id,
      status: 'pending',
      proposedTime: proposedTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
      message: `Reschedule request sent. Waiting for ${isMentor ? 'mentee' : 'mentor'} approval.`
    });

  } catch (error) {
    console.error('Reschedule request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reschedule request' },
      { status: 500 }
    );
  }
}

// GET /api/bookings/[id]/reschedule - Get pending reschedule request
export async function GET(
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending reschedule request for this session
    const pendingRequest = await db
      .select()
      .from(rescheduleRequests)
      .where(
        and(
          eq(rescheduleRequests.sessionId, id),
          eq(rescheduleRequests.status, 'pending')
        )
      )
      .limit(1);

    if (!pendingRequest.length) {
      return NextResponse.json({ hasPendingRequest: false });
    }

    return NextResponse.json({
      hasPendingRequest: true,
      request: pendingRequest[0],
    });

  } catch (error) {
    console.error('Error fetching reschedule request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reschedule request' },
      { status: 500 }
    );
  }
}