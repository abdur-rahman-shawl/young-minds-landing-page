import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireMentor } from '@/lib/api/guards';

// POST /api/bookings/[id]/no-show - Mark a booking as no-show
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

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
    
    // Only mentors can mark sessions as no-show
    const isMentor = booking.mentorId === session.user.id;
    
    if (!isMentor) {
      return NextResponse.json(
        { error: 'Only mentors can mark sessions as no-show' },
        { status: 403 }
      );
    }

    // Check if booking can be marked as no-show
    if (booking.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot mark a ${booking.status} session as no-show` },
        { status: 400 }
      );
    }

    // Check if session time has passed
    const scheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    
    if (now < scheduledTime) {
      return NextResponse.json(
        { error: 'Cannot mark future sessions as no-show' },
        { status: 400 }
      );
    }

    // Check if it's within reasonable time after session (e.g., 24 hours)
    const hoursSinceSession = (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSession > 24) {
      return NextResponse.json(
        { error: 'Cannot mark sessions as no-show after 24 hours' },
        { status: 400 }
      );
    }

    // Update the booking
    const [noShowBooking] = await db
      .update(sessions)
      .set({
        status: 'no_show',
        noShowMarkedBy: 'mentor',
        noShowMarkedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, params.id))
      .returning();

    // Get mentee details for notification
    const [mentee] = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, booking.menteeId))
      .limit(1);

    // Notify the mentee
    await db.insert(notifications).values({
      userId: booking.menteeId,
      type: 'SESSION_REMINDER',
      title: 'Session Marked as No-Show',
      message: `Your session "${booking.title}" was marked as no-show. Please ensure to attend future sessions or cancel in advance.`,
      relatedId: booking.id,
      relatedType: 'session',
      actionUrl: `/dashboard?section=sessions`,
      actionText: 'View Sessions',
    });

    return NextResponse.json({
      success: true,
      booking: noShowBooking,
      message: 'Session marked as no-show'
    });

  } catch (error) {
    console.error('No-show marking error:', error);
    
    return NextResponse.json(
      { error: 'Failed to mark session as no-show' },
      { status: 500 }
    );
  }
}
