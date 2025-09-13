import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

const cancelBookingSchema = z.object({
  reason: z.string().max(500, 'Cancellation reason must be less than 500 characters').optional(),
});

// POST /api/bookings/[id]/cancel - Cancel a booking
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
    const { reason } = cancelBookingSchema.parse(body);

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
    
    // Check if user is participant
    const isMentor = booking.mentorId === session.user.id;
    const isMentee = booking.menteeId === session.user.id;
    
    if (!isMentor && !isMentee) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this booking' },
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

    // Check cancellation time constraints (e.g., 2 hours before session)
    const scheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < 2 && hoursUntilSession > 0) {
      return NextResponse.json(
        { error: 'Sessions cannot be cancelled within 2 hours of the scheduled time' },
        { status: 400 }
      );
    }

    // Update the booking
    const [cancelledBooking] = await db
      .update(sessions)
      .set({
        status: 'cancelled',
        cancelledBy: isMentor ? 'mentor' : 'mentee',
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, params.id))
      .returning();

    // Notify the other party
    const otherUserId = isMentor ? booking.menteeId : booking.mentorId;
    const userRole = isMentor ? 'mentor' : 'mentee';

    await db.insert(notifications).values({
      userId: otherUserId,
      type: 'BOOKING_CANCELLED',
      title: 'Session Cancelled',
      message: `Your session "${booking.title}" has been cancelled by the ${userRole}${reason ? `. Reason: ${reason}` : ''}`,
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