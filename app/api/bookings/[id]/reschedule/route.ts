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

// POST /api/bookings/[id]/reschedule - Reschedule a booking (MENTEE ONLY)
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

    // MENTEE ONLY: Only the mentee can reschedule the session
    const isMentee = booking.menteeId === session.user.id;

    if (!isMentee) {
      return NextResponse.json(
        { error: 'Only the mentee can reschedule this session. Please contact the mentee if you need to modify the booking.' },
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

    // Load policies from DB
    const rescheduleCutoffHours = parseInt(
      await getPolicyValue(
        DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.key,
        DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.value
      )
    );

    const maxReschedules = parseInt(
      await getPolicyValue(
        DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.key,
        DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.value
      )
    );

    // Check reschedule count limit
    if (booking.rescheduleCount >= maxReschedules) {
      return NextResponse.json(
        {
          error: `This session has already been rescheduled ${maxReschedules} time(s). No further rescheduling is allowed.`,
          rescheduleCount: booking.rescheduleCount,
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
      return NextResponse.json(
        { error: `Sessions cannot be rescheduled within ${rescheduleCutoffHours} hours of the scheduled time` },
        { status: 400 }
      );
    }

    const newScheduledTime = new Date(scheduledAt);
    const newRescheduleCount = booking.rescheduleCount + 1;

    // Update the booking with new schedule (no copy needed - simpler approach)
    const [rescheduledBooking] = await db
      .update(sessions)
      .set({
        scheduledAt: newScheduledTime,
        duration: duration || booking.duration,
        rescheduleCount: newRescheduleCount,
        updatedAt: new Date(),
      })
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
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Format dates for notification
    const oldDateStr = format(oldScheduledTime, "EEEE, MMMM d 'at' h:mm a");
    const newDateStr = format(newScheduledTime, "EEEE, MMMM d 'at' h:mm a");

    // Notify the mentor
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

    // Notify the mentee (confirmation)
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

    return NextResponse.json({
      success: true,
      booking: rescheduledBooking,
      rescheduleCount: newRescheduleCount,
      maxReschedules,
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