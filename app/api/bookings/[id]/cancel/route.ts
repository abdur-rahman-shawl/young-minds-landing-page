import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionPolicies, sessionAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { CANCELLATION_REASONS, MENTOR_CANCELLATION_REASONS, DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';

// All valid cancellation reason values (mentee + mentor combined)
const allReasonValues = [
  ...CANCELLATION_REASONS.map(r => r.value),
  ...MENTOR_CANCELLATION_REASONS.map(r => r.value),
] as const;

const cancelBookingSchema = z.object({
  reasonCategory: z.enum(allReasonValues as unknown as [string, ...string[]]),
  reasonDetails: z.string().max(500, 'Reason details must be less than 500 characters').optional(),
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

// POST /api/bookings/[id]/cancel - Cancel a booking (MENTOR OR MENTEE)
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
    const { reasonCategory, reasonDetails } = cancelBookingSchema.parse(body);

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
        { error: 'You are not authorized to cancel this session.' },
        { status: 403 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      );
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed session' },
        { status: 400 }
      );
    }

    if (booking.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot cancel a session that is in progress' },
        { status: 400 }
      );
    }

    // Load cancellation policy from DB based on role
    const cancellationCutoffHours = isMentor
      ? parseInt(
        await getPolicyValue(
          DEFAULT_SESSION_POLICIES.MENTOR_CANCELLATION_CUTOFF_HOURS.key,
          DEFAULT_SESSION_POLICIES.MENTOR_CANCELLATION_CUTOFF_HOURS.value
        )
      )
      : parseInt(
        await getPolicyValue(
          DEFAULT_SESSION_POLICIES.CANCELLATION_CUTOFF_HOURS.key,
          DEFAULT_SESSION_POLICIES.CANCELLATION_CUTOFF_HOURS.value
        )
      );

    // Check cancellation time constraints
    const scheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < cancellationCutoffHours && hoursUntilSession > 0) {
      const roleLabel = isMentor ? 'Mentors' : 'Mentees';
      return NextResponse.json(
        { error: `${roleLabel} cannot cancel sessions within ${cancellationCutoffHours} hour(s) of the scheduled time` },
        { status: 400 }
      );
    }

    // Determine which reason list to use for label lookup
    const reasonList = isMentor ? MENTOR_CANCELLATION_REASONS : CANCELLATION_REASONS;
    const reasonLabel = reasonList.find(r => r.value === reasonCategory)?.label || reasonCategory;
    const fullReason = reasonDetails ? `${reasonLabel}: ${reasonDetails}` : reasonLabel;

    // Determine who cancelled
    const cancelledBy = isMentor ? 'mentor' : 'mentee';

    // Update the booking
    const [cancelledBooking] = await db
      .update(sessions)
      .set({
        status: 'cancelled',
        cancelledBy: cancelledBy,
        cancellationReason: fullReason,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();

    // Create audit log entry
    await db.insert(sessionAuditLog).values({
      sessionId: booking.id,
      userId: session.user.id,
      action: 'cancel',
      reasonCategory: reasonCategory,
      reasonDetails: reasonDetails,
      policySnapshot: {
        cancellationCutoffHours,
        hoursUntilSession: Math.round(hoursUntilSession * 100) / 100,
        cancelledBy,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Notify the other party
    if (isMentor) {
      // Mentor cancelled → notify mentee
      await db.insert(notifications).values({
        userId: booking.menteeId,
        type: 'BOOKING_CANCELLED',
        title: 'Session Cancelled by Mentor',
        message: `Your session "${booking.title}" has been cancelled by the mentor. Reason: ${fullReason}`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=sessions`,
        actionText: 'View Sessions',
      });

      // Confirmation to mentor
      await db.insert(notifications).values({
        userId: booking.mentorId,
        type: 'BOOKING_CANCELLED',
        title: 'Session Cancellation Confirmed',
        message: `You have cancelled the session "${booking.title}".`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=schedule`,
        actionText: 'View Schedule',
      });
    } else {
      // Mentee cancelled → notify mentor
      await db.insert(notifications).values({
        userId: booking.mentorId,
        type: 'BOOKING_CANCELLED',
        title: 'Session Cancelled by Mentee',
        message: `Your session "${booking.title}" has been cancelled. Reason: ${fullReason}`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=schedule`,
        actionText: 'View Schedule',
      });

      // Confirmation to mentee
      await db.insert(notifications).values({
        userId: booking.menteeId,
        type: 'BOOKING_CANCELLED',
        title: 'Session Cancellation Confirmed',
        message: `Your session "${booking.title}" has been cancelled successfully.`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=sessions`,
        actionText: 'View Sessions',
      });
    }

    return NextResponse.json({
      success: true,
      booking: cancelledBooking,
      cancelledBy,
      message: 'Session cancelled successfully'
    });

  } catch (error) {
    console.error('Booking cancellation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}