import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionPolicies, sessionAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { CANCELLATION_REASONS, DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';

const cancelBookingSchema = z.object({
  reasonCategory: z.enum([
    'schedule_conflict',
    'personal_emergency',
    'no_longer_needed',
    'found_alternative',
    'technical_issues',
    'other'
  ]),
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

// POST /api/bookings/[id]/cancel - Cancel a booking (MENTEE ONLY)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await req.json();
    const { reasonCategory, reasonDetails } = cancelBookingSchema.parse(body);

    // Get the existing booking
    const existingBooking = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, params.id))
      .limit(1);

    if (!existingBooking.length) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = existingBooking[0];

    // MENTEE ONLY: Only the mentee can cancel the session
    const isMentee = booking.menteeId === session.user.id;

    if (!isMentee) {
      return NextResponse.json(
        { error: 'Only the mentee can cancel this session. Please contact the mentee if you need to modify the booking.' },
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

    // Load cancellation policy from DB
    const cancellationCutoffHours = parseInt(
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
      return NextResponse.json(
        { error: `Sessions cannot be cancelled within ${cancellationCutoffHours} hours of the scheduled time` },
        { status: 400 }
      );
    }

    // Get reason label for notification
    const reasonLabel = CANCELLATION_REASONS.find(r => r.value === reasonCategory)?.label || reasonCategory;
    const fullReason = reasonDetails ? `${reasonLabel}: ${reasonDetails}` : reasonLabel;

    // Update the booking
    const [cancelledBooking] = await db
      .update(sessions)
      .set({
        status: 'cancelled',
        cancelledBy: 'mentee',
        cancellationReason: fullReason,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, params.id))
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
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Notify the mentor
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

    // Notify the mentee (confirmation)
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

    return NextResponse.json({
      success: true,
      booking: cancelledBooking,
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