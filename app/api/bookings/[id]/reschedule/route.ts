import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

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

// POST /api/bookings/[id]/reschedule - Reschedule a booking
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
    const { scheduledAt, duration } = rescheduleBookingSchema.parse(body);

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
        { error: 'You are not authorized to reschedule this booking' },
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

    // Check rescheduling time constraints
    const oldScheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (oldScheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < 4 && hoursUntilSession > 0) {
      return NextResponse.json(
        { error: 'Sessions cannot be rescheduled within 4 hours of the scheduled time' },
        { status: 400 }
      );
    }

    // Create a copy of the old session as rescheduled_from reference
    const [oldSessionCopy] = await db
      .insert(sessions)
      .values({
        ...booking,
        id: undefined, // Let DB generate new ID
        status: 'cancelled',
        cancelledBy: isMentor ? 'mentor' : 'mentee',
        cancellationReason: 'Rescheduled',
        createdAt: booking.createdAt,
        updatedAt: new Date(),
      })
      .returning();

    // Update the booking with new schedule
    const [rescheduledBooking] = await db
      .update(sessions)
      .set({
        scheduledAt: new Date(scheduledAt),
        duration: duration || booking.duration,
        rescheduledFrom: oldSessionCopy.id,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, params.id))
      .returning();

    // Notify the other party
    const otherUserId = isMentor ? booking.menteeId : booking.mentorId;
    const userRole = isMentor ? 'mentor' : 'mentee';
    const oldDate = new Date(booking.scheduledAt).toLocaleString();
    const newDate = new Date(scheduledAt).toLocaleString();

    await db.insert(notifications).values({
      userId: otherUserId,
      type: 'BOOKING_RESCHEDULED',
      title: 'Session Rescheduled',
      message: `Your session "${booking.title}" has been rescheduled by the ${userRole}. Old time: ${oldDate}, New time: ${newDate}`,
      relatedId: booking.id,
      relatedType: 'session',
      actionUrl: `/dashboard?section=sessions`,
      actionText: 'View New Time',
    });

    return NextResponse.json({
      success: true,
      booking: rescheduledBooking,
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