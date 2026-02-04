import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionAuditLog, mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const rejectReassignmentSchema = z.object({
    reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

/**
 * POST /api/bookings/[id]/reject-reassignment
 * 
 * Allows a mentee to reject a session that was auto-reassigned after the
 * original mentor cancelled. This results in full cancellation with 100% refund.
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

        const body = await req.json();
        const { reason } = rejectReassignmentSchema.parse(body);

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
                { error: 'Only the mentee can reject a reassignment' },
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

        // Calculate 100% refund
        const sessionRate = booking.rate ? parseFloat(booking.rate) : 0;
        const refundAmount = sessionRate;
        const refundPercentage = 100;

        // Cancel the session with full refund
        const [cancelledBooking] = await db
            .update(sessions)
            .set({
                status: 'cancelled',
                reassignmentStatus: 'rejected',
                cancelledBy: 'mentee',
                cancellationReason: reason || 'Mentee rejected auto-reassigned mentor',
                refundPercentage: refundPercentage,
                refundAmount: refundAmount.toFixed(2),
                refundStatus: refundAmount > 0 ? 'pending' : 'none',
                updatedAt: new Date(),
            })
            .where(eq(sessions.id, id))
            .returning();

        // Get mentor names for notifications
        const [newMentorData] = await db
            .select({ name: users.name })
            .from(mentors)
            .innerJoin(users, eq(mentors.userId, users.id))
            .where(eq(mentors.userId, booking.mentorId))
            .limit(1);

        const newMentorName = newMentorData?.name || 'The assigned mentor';

        // Notify the new mentor
        await db.insert(notifications).values({
            userId: booking.mentorId,
            type: 'REASSIGNMENT_REJECTED',
            title: 'Session Cancelled - Mentee Declined Reassignment',
            message: `The mentee declined the reassigned session "${booking.title}". The session has been cancelled.`,
            relatedId: booking.id,
            relatedType: 'session',
            actionUrl: `/dashboard?section=schedule`,
            actionText: 'View Schedule',
        });

        // Notify original mentor (if different from new mentor, which it should be)
        if (booking.reassignedFromMentorId && booking.reassignedFromMentorId !== booking.mentorId) {
            await db.insert(notifications).values({
                userId: booking.reassignedFromMentorId,
                type: 'BOOKING_CANCELLED',
                title: 'Reassigned Session Cancelled',
                message: `The session "${booking.title}" that was reassigned after your cancellation has been fully cancelled by the mentee.`,
                relatedId: booking.id,
                relatedType: 'session',
            });
        }

        // Confirmation notification to mentee
        const refundMessage = refundAmount > 0
            ? ` A full refund of $${refundAmount.toFixed(2)} will be processed.`
            : '';

        await db.insert(notifications).values({
            userId: booking.menteeId,
            type: 'BOOKING_CANCELLED',
            title: 'Session Cancelled',
            message: `Your session "${booking.title}" has been cancelled.${refundMessage}`,
            relatedId: booking.id,
            relatedType: 'session',
            actionUrl: `/dashboard?section=sessions`,
            actionText: 'View Sessions',
        });

        // Audit log
        await db.insert(sessionAuditLog).values({
            sessionId: booking.id,
            userId: session.user.id,
            action: 'reassignment_rejected',
            reasonDetails: reason || 'Mentee rejected auto-reassigned mentor',
            policySnapshot: {
                originalMentor: booking.reassignedFromMentorId,
                rejectedMentor: booking.mentorId,
                refundPercentage,
                refundAmount,
                reason: 'Full refund due to mentor cancellation + reassignment rejection'
            },
            ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            booking: cancelledBooking,
            refundPercentage,
            refundAmount,
            message: `Session cancelled. You will receive a full refund of $${refundAmount.toFixed(2)}.`
        });

    } catch (error) {
        console.error('Reject reassignment error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input data', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to reject reassignment' },
            { status: 500 }
        );
    }
}
