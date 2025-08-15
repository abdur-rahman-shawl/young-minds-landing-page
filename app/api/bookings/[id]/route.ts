import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for booking updates
const updateBookingSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().min(15).max(240).optional(),
  meetingType: z.enum(['video', 'audio', 'chat']).optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  mentorNotes: z.string().optional(),
  menteeNotes: z.string().optional(),
  mentorRating: z.number().min(1).max(5).optional(),
  menteeRating: z.number().min(1).max(5).optional(),
});

// GET /api/bookings/[id] - Get specific booking
export async function GET(
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

    const booking = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, params.id),
          or(
            eq(sessions.mentorId, session.user.id),
            eq(sessions.menteeId, session.user.id)
          )
        )
      )
      .limit(1);

    if (!booking.length) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: booking[0]
    });

  } catch (error) {
    console.error('Booking fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
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
    const validatedData = updateBookingSchema.parse(body);

    // Get the existing booking
    const existingBooking = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, params.id),
          or(
            eq(sessions.mentorId, session.user.id),
            eq(sessions.menteeId, session.user.id)
          )
        )
      )
      .limit(1);

    if (!existingBooking.length) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    const booking = existingBooking[0];
    const isMentor = booking.mentorId === session.user.id;
    const isMentee = booking.menteeId === session.user.id;

    // Update the booking
    const [updatedBooking] = await db
      .update(sessions)
      .set({
        ...validatedData,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, params.id))
      .returning();

    // Create notifications for status changes
    if (validatedData.status && validatedData.status !== booking.status) {
      const otherUserId = isMentor ? booking.menteeId : booking.mentorId;
      const userRole = isMentor ? 'mentor' : 'mentee';
      
      let notificationType: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'SESSION_COMPLETED';
      let title = '';
      let message = '';

      switch (validatedData.status) {
        case 'cancelled':
          notificationType = 'BOOKING_CANCELLED';
          title = 'Session Cancelled';
          message = `Your session "${booking.title}" has been cancelled by the ${userRole}`;
          break;
        case 'completed':
          notificationType = 'SESSION_COMPLETED';
          title = 'Session Completed';
          message = `Your session "${booking.title}" has been marked as completed`;
          break;
        default:
          notificationType = 'BOOKING_CONFIRMED';
          title = 'Session Updated';
          message = `Your session "${booking.title}" has been updated by the ${userRole}`;
      }

      await db.insert(notifications).values({
        userId: otherUserId,
        type: notificationType,
        title,
        message,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=${isMentor ? 'sessions' : 'schedule'}`,
        actionText: 'View Details',
      });
    }

    // Handle rescheduling notification
    if (validatedData.scheduledAt && validatedData.scheduledAt !== booking.scheduledAt?.toISOString()) {
      const otherUserId = isMentor ? booking.menteeId : booking.mentorId;
      const userRole = isMentor ? 'mentor' : 'mentee';

      await db.insert(notifications).values({
        userId: otherUserId,
        type: 'BOOKING_RESCHEDULED',
        title: 'Session Rescheduled',
        message: `Your session "${booking.title}" has been rescheduled by the ${userRole}`,
        relatedId: booking.id,
        relatedType: 'session',
        actionUrl: `/dashboard?section=${isMentor ? 'sessions' : 'schedule'}`,
        actionText: 'View New Time',
      });
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking updated successfully!'
    });

  } catch (error) {
    console.error('Booking update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Cancel/Delete booking
export async function DELETE(
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

    // Get the existing booking
    const existingBooking = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, params.id),
          or(
            eq(sessions.mentorId, session.user.id),
            eq(sessions.menteeId, session.user.id)
          )
        )
      )
      .limit(1);

    if (!existingBooking.length) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    const booking = existingBooking[0];
    const isMentor = booking.mentorId === session.user.id;

    // Update status to cancelled instead of deleting
    const [cancelledBooking] = await db
      .update(sessions)
      .set({
        status: 'cancelled',
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
      message: `Your session "${booking.title}" has been cancelled by the ${userRole}`,
      relatedId: booking.id,
      relatedType: 'session',
      actionUrl: `/dashboard?section=${isMentor ? 'sessions' : 'schedule'}`,
      actionText: 'View Details',
    });

    return NextResponse.json({
      success: true,
      booking: cancelledBooking,
      message: 'Booking cancelled successfully!'
    });

  } catch (error) {
    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}