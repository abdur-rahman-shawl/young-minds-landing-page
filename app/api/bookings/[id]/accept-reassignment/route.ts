import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionAuditLog, mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/bookings/[id]/accept-reassignment
 * 
 * Allows a mentee to explicitly accept a session that was auto-reassigned
 * after the original mentor cancelled.
 */
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

        // Get the booking
        const [booking] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, id))
            .limit(1);

        if (!booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Verify user is the mentee
        if (booking.menteeId !== session.user.id) {
            return NextResponse.json(
                { error: 'Only the mentee can accept a reassignment' },
                { status: 403 }
            );
        }

        // Verify this is a reassigned session pending acceptance
        if (!booking.wasReassigned || booking.reassignmentStatus !== 'pending_acceptance') {
            return NextResponse.json(
                { error: 'This session is not pending reassignment acceptance' },
                { status: 400 }
            );
        }

        // Update the session to mark acceptance
        const [updatedBooking] = await db
            .update(sessions)
            .set({
                reassignmentStatus: 'accepted',
                updatedAt: new Date(),
            })
            .where(eq(sessions.id, id))
            .returning();

        // Get new mentor details for notification
        const [newMentorData] = await db
            .select({ name: users.name })
            .from(mentors)
            .innerJoin(users, eq(mentors.userId, users.id))
            .where(eq(mentors.userId, booking.mentorId))
            .limit(1);

        const newMentorName = newMentorData?.name || 'Your mentor';

        // Notify the new mentor that mentee confirmed
        await db.insert(notifications).values({
            userId: booking.mentorId,
            type: 'REASSIGNMENT_ACCEPTED',
            title: 'Mentee Confirmed Session',
            message: `The mentee has confirmed the reassigned session "${booking.title}". The session will proceed as scheduled.`,
            relatedId: booking.id,
            relatedType: 'session',
            actionUrl: `/dashboard?section=schedule`,
            actionText: 'View Session',
        });

        // Audit log
        await db.insert(sessionAuditLog).values({
            sessionId: booking.id,
            userId: session.user.id,
            action: 'reassignment_accepted',
            reasonDetails: 'Mentee accepted auto-reassigned mentor',
            policySnapshot: {
                originalMentor: booking.reassignedFromMentorId,
                newMentor: booking.mentorId,
            },
            ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            booking: updatedBooking,
            message: `Great! You've confirmed your session with ${newMentorName}.`
        });

    } catch (error) {
        console.error('Accept reassignment error:', error);
        return NextResponse.json(
            { error: 'Failed to accept reassignment' },
            { status: 500 }
        );
    }
}
