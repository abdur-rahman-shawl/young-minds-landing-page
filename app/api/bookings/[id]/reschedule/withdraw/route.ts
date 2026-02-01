import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, rescheduleRequests, sessionAuditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { format } from 'date-fns';

/**
 * POST /api/bookings/[id]/reschedule/withdraw
 * 
 * Allows the initiator of a reschedule request to withdraw their request.
 * - Only the initiator can withdraw their own request
 * - Session remains at original scheduled time
 * - Logged in session_audit_log
 * - Notifies the other party
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params;
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Get the session/booking
        const [booking] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!booking) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Check if there's a pending reschedule request
        if (!booking.pendingRescheduleRequestId) {
            return NextResponse.json(
                { error: 'No pending reschedule request to withdraw' },
                { status: 400 }
            );
        }

        // Get the reschedule request
        const [rescheduleRequest] = await db
            .select()
            .from(rescheduleRequests)
            .where(
                and(
                    eq(rescheduleRequests.id, booking.pendingRescheduleRequestId),
                    eq(rescheduleRequests.sessionId, sessionId)
                )
            )
            .limit(1);

        if (!rescheduleRequest) {
            return NextResponse.json(
                { error: 'Reschedule request not found' },
                { status: 404 }
            );
        }

        // Only allow status 'pending' or 'counter_proposed' to be withdrawn
        if (!['pending', 'counter_proposed'].includes(rescheduleRequest.status)) {
            return NextResponse.json(
                { error: 'This reschedule request cannot be withdrawn - it has already been resolved' },
                { status: 400 }
            );
        }

        // Verify user is the INITIATOR of the request
        if (rescheduleRequest.initiatorId !== session.user.id) {
            return NextResponse.json(
                { error: 'Only the initiator can withdraw a reschedule request' },
                { status: 403 }
            );
        }

        const now = new Date();
        const userRole = rescheduleRequest.initiatedBy; // 'mentor' or 'mentee'

        // 1. Update reschedule_requests - mark as cancelled
        await db.update(rescheduleRequests)
            .set({
                status: 'cancelled',
                resolvedBy: userRole,
                resolverId: session.user.id,
                resolvedAt: now,
                resolutionNote: 'Withdrawn by initiator',
                updatedAt: now,
            })
            .where(eq(rescheduleRequests.id, rescheduleRequest.id));

        // 2. Clear pending reschedule fields on session (keep original scheduledAt)
        await db.update(sessions)
            .set({
                pendingRescheduleRequestId: null,
                pendingRescheduleTime: null,
                pendingRescheduleBy: null,
                updatedAt: now,
            })
            .where(eq(sessions.id, sessionId));

        // 3. Log in session_audit_log
        await db.insert(sessionAuditLog).values({
            sessionId: booking.id,
            userId: session.user.id,
            action: 'reschedule_withdrawn',
            previousScheduledAt: rescheduleRequest.proposedTime,
            newScheduledAt: null, // No change to actual time
            policySnapshot: {
                withdrawnBy: userRole,
                originalTime: booking.scheduledAt,
                proposedTime: rescheduleRequest.proposedTime,
                requestId: rescheduleRequest.id,
            },
        });

        // 4. Notify the other party
        const otherPartyId = userRole === 'mentor' ? booking.menteeId : booking.mentorId;
        const initiatorLabel = userRole === 'mentor' ? 'Your mentor' : 'Your mentee';
        const originalTimeStr = format(new Date(booking.scheduledAt), "EEEE, MMMM d 'at' h:mm a");

        await db.insert(notifications).values({
            userId: otherPartyId,
            type: 'RESCHEDULE_WITHDRAWN',
            title: 'Reschedule Request Withdrawn',
            message: `${initiatorLabel} has withdrawn their reschedule request for "${booking.title}". The session remains scheduled for ${originalTimeStr}.`,
            relatedId: booking.id,
            relatedType: 'session',
            actionUrl: `/dashboard?section=sessions`,
            actionText: 'View Session',
        });

        return NextResponse.json({
            success: true,
            message: 'Reschedule request withdrawn successfully. The session remains at its original time.',
            originalScheduledAt: booking.scheduledAt,
        });

    } catch (error) {
        console.error('Withdraw reschedule error:', error);
        return NextResponse.json(
            { error: 'Failed to withdraw reschedule request' },
            { status: 500 }
        );
    }
}
