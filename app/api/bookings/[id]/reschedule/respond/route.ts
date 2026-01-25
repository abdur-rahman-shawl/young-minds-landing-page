import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, rescheduleRequests, sessionAuditLog, sessionPolicies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { format, addHours } from 'date-fns';
import { DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';

const respondSchema = z.object({
    requestId: z.string().uuid('Invalid request ID'),
    action: z.enum(['accept', 'reject', 'counter_propose', 'cancel_session']),
    counterProposedTime: z.string().datetime().optional(),
    cancellationReason: z.string().max(500).optional(),
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

// POST /api/bookings/[id]/reschedule/respond - Respond to a reschedule request
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

        const body = await req.json();
        const { requestId, action, counterProposedTime, cancellationReason } = respondSchema.parse(body);

        // Get the reschedule request
        const [rescheduleRequest] = await db
            .select()
            .from(rescheduleRequests)
            .where(
                and(
                    eq(rescheduleRequests.id, requestId),
                    eq(rescheduleRequests.sessionId, sessionId),
                    eq(rescheduleRequests.status, 'pending')
                )
            )
            .limit(1);

        if (!rescheduleRequest) {
            return NextResponse.json(
                { error: 'Reschedule request not found or already resolved' },
                { status: 404 }
            );
        }

        // Check if request has expired
        if (rescheduleRequest.expiresAt && new Date() > rescheduleRequest.expiresAt) {
            await db.update(rescheduleRequests)
                .set({ status: 'expired', resolvedAt: new Date() })
                .where(eq(rescheduleRequests.id, requestId));

            return NextResponse.json(
                { error: 'This reschedule request has expired' },
                { status: 400 }
            );
        }

        // Get the session
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

        // Verify user is authorized to respond (must be the OTHER party)
        const isMentor = booking.mentorId === session.user.id;
        const isMentee = booking.menteeId === session.user.id;
        const userRole = isMentor ? 'mentor' : 'mentee';

        // The responder should be the opposite of who initiated
        if (rescheduleRequest.initiatedBy === userRole) {
            return NextResponse.json(
                { error: 'You cannot respond to your own reschedule request' },
                { status: 403 }
            );
        }

        if (!isMentor && !isMentee) {
            return NextResponse.json(
                { error: 'You are not authorized to respond to this request' },
                { status: 403 }
            );
        }

        const now = new Date();

        // Handle different actions
        switch (action) {
            case 'accept': {
                // Update session with new time
                const updateData: Record<string, unknown> = {
                    scheduledAt: rescheduleRequest.proposedTime,
                    duration: rescheduleRequest.proposedDuration || booking.duration,
                    pendingRescheduleRequestId: null,
                    pendingRescheduleTime: null,
                    pendingRescheduleBy: null,
                    updatedAt: now,
                };

                // Increment reschedule count for the initiator
                if (rescheduleRequest.initiatedBy === 'mentor') {
                    updateData.mentorRescheduleCount = (booking.mentorRescheduleCount ?? 0) + 1;
                } else {
                    updateData.rescheduleCount = booking.rescheduleCount + 1;
                }

                await db.update(sessions).set(updateData).where(eq(sessions.id, sessionId));

                // Update request status
                await db.update(rescheduleRequests)
                    .set({
                        status: 'accepted',
                        resolvedBy: userRole,
                        resolverId: session.user.id,
                        resolvedAt: now,
                        updatedAt: now,
                    })
                    .where(eq(rescheduleRequests.id, requestId));

                // Notify the initiator
                const initiatorId = rescheduleRequest.initiatedBy === 'mentor' ? booking.mentorId : booking.menteeId;
                const newDateStr = format(rescheduleRequest.proposedTime, "EEEE, MMMM d 'at' h:mm a");

                await db.insert(notifications).values({
                    userId: initiatorId,
                    type: 'RESCHEDULE_ACCEPTED',
                    title: 'Reschedule Accepted',
                    message: `Your reschedule request for "${booking.title}" has been accepted. New time: ${newDateStr}`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=sessions`,
                    actionText: 'View Session',
                });

                // Create audit log
                await db.insert(sessionAuditLog).values({
                    sessionId: booking.id,
                    userId: session.user.id,
                    action: 'reschedule_accepted',
                    previousScheduledAt: rescheduleRequest.originalTime,
                    newScheduledAt: rescheduleRequest.proposedTime,
                    policySnapshot: { initiatedBy: rescheduleRequest.initiatedBy, acceptedBy: userRole },
                });

                return NextResponse.json({
                    success: true,
                    action: 'accepted',
                    newScheduledAt: rescheduleRequest.proposedTime,
                    message: 'Reschedule request accepted. Session has been updated.',
                });
            }

            case 'reject': {
                // Clear pending reschedule from session
                await db.update(sessions)
                    .set({
                        pendingRescheduleRequestId: null,
                        pendingRescheduleTime: null,
                        pendingRescheduleBy: null,
                        updatedAt: now,
                    })
                    .where(eq(sessions.id, sessionId));

                // Update request status
                await db.update(rescheduleRequests)
                    .set({
                        status: 'rejected',
                        resolvedBy: userRole,
                        resolverId: session.user.id,
                        resolvedAt: now,
                        updatedAt: now,
                    })
                    .where(eq(rescheduleRequests.id, requestId));

                // Notify the initiator
                const initiatorId = rescheduleRequest.initiatedBy === 'mentor' ? booking.mentorId : booking.menteeId;

                await db.insert(notifications).values({
                    userId: initiatorId,
                    type: 'RESCHEDULE_REJECTED',
                    title: 'Reschedule Request Declined',
                    message: `Your reschedule request for "${booking.title}" was not accepted. The original time remains.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=sessions`,
                    actionText: 'View Session',
                });

                return NextResponse.json({
                    success: true,
                    action: 'rejected',
                    message: 'Reschedule request declined. Original time remains.',
                });
            }

            case 'counter_propose': {
                if (!counterProposedTime) {
                    return NextResponse.json(
                        { error: 'Counter proposed time is required' },
                        { status: 400 }
                    );
                }

                const counterTime = new Date(counterProposedTime);

                // Check max counter proposals
                const maxCounterProposals = parseInt(
                    await getPolicyValue(
                        DEFAULT_SESSION_POLICIES.MAX_COUNTER_PROPOSALS.key,
                        DEFAULT_SESSION_POLICIES.MAX_COUNTER_PROPOSALS.value
                    )
                );

                if (rescheduleRequest.counterProposalCount >= maxCounterProposals) {
                    return NextResponse.json(
                        { error: `Maximum of ${maxCounterProposals} counter-proposals reached. Please accept, reject, or cancel.` },
                        { status: 400 }
                    );
                }

                // Get new expiry time
                const expiryHours = parseInt(
                    await getPolicyValue(
                        DEFAULT_SESSION_POLICIES.RESCHEDULE_REQUEST_EXPIRY_HOURS.key,
                        DEFAULT_SESSION_POLICIES.RESCHEDULE_REQUEST_EXPIRY_HOURS.value
                    )
                );
                const newExpiresAt = addHours(now, expiryHours);

                // Update request with counter-proposal
                await db.update(rescheduleRequests)
                    .set({
                        status: 'counter_proposed',
                        counterProposedTime: counterTime,
                        counterProposedBy: userRole,
                        counterProposalCount: rescheduleRequest.counterProposalCount + 1,
                        expiresAt: newExpiresAt,
                        updatedAt: now,
                    })
                    .where(eq(rescheduleRequests.id, requestId));

                // Update session pending info
                await db.update(sessions)
                    .set({
                        pendingRescheduleTime: counterTime,
                        pendingRescheduleBy: userRole,
                        updatedAt: now,
                    })
                    .where(eq(sessions.id, sessionId));

                // Notify the original initiator
                const initiatorId = rescheduleRequest.initiatedBy === 'mentor' ? booking.mentorId : booking.menteeId;
                const counterDateStr = format(counterTime, "EEEE, MMMM d 'at' h:mm a");

                await db.insert(notifications).values({
                    userId: initiatorId,
                    type: 'RESCHEDULE_COUNTER',
                    title: 'Counter-Proposal Received',
                    message: `A different time was suggested for "${booking.title}": ${counterDateStr}. Please respond.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=sessions&action=reschedule-response&sessionId=${booking.id}`,
                    actionText: 'Respond Now',
                });

                return NextResponse.json({
                    success: true,
                    action: 'counter_proposed',
                    counterProposedTime: counterTime,
                    counterProposalCount: rescheduleRequest.counterProposalCount + 1,
                    message: 'Counter-proposal sent.',
                });
            }

            case 'cancel_session': {
                // This is for mentee cancelling when mentor reschedules (100% refund)
                if (userRole !== 'mentee') {
                    return NextResponse.json(
                        { error: 'Only mentees can cancel via reschedule response' },
                        { status: 403 }
                    );
                }

                const sessionRate = booking.rate ? parseFloat(booking.rate) : 0;
                const refundPercentage = 100; // Full refund when cancelling due to mentor reschedule
                const refundAmount = sessionRate;

                // Cancel the session
                await db.update(sessions)
                    .set({
                        status: 'cancelled',
                        cancelledBy: 'mentee',
                        cancellationReason: cancellationReason || 'Cancelled due to mentor reschedule request',
                        refundPercentage,
                        refundAmount: refundAmount.toFixed(2),
                        refundStatus: refundAmount > 0 ? 'pending' : 'none',
                        pendingRescheduleRequestId: null,
                        pendingRescheduleTime: null,
                        pendingRescheduleBy: null,
                        updatedAt: now,
                    })
                    .where(eq(sessions.id, sessionId));

                // Update request status
                await db.update(rescheduleRequests)
                    .set({
                        status: 'cancelled',
                        resolvedBy: 'mentee',
                        resolverId: session.user.id,
                        resolvedAt: now,
                        cancellationReason: cancellationReason,
                        updatedAt: now,
                    })
                    .where(eq(rescheduleRequests.id, requestId));

                // Notify mentor
                await db.insert(notifications).values({
                    userId: booking.mentorId,
                    type: 'BOOKING_CANCELLED',
                    title: 'Session Cancelled',
                    message: `"${booking.title}" has been cancelled by the mentee in response to your reschedule request.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
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
                    message: `Your session "${booking.title}" has been cancelled. A full refund of $${refundAmount.toFixed(2)} will be processed.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=sessions`,
                    actionText: 'View Sessions',
                });

                // Create audit log
                await db.insert(sessionAuditLog).values({
                    sessionId: booking.id,
                    userId: session.user.id,
                    action: 'cancel',
                    reasonCategory: 'reschedule_response_cancel',
                    reasonDetails: cancellationReason,
                    policySnapshot: {
                        cancelledBy: 'mentee',
                        reason: 'Cancelled in response to mentor reschedule request',
                        refundPercentage,
                        refundAmount,
                    },
                });

                return NextResponse.json({
                    success: true,
                    action: 'cancelled',
                    refundPercentage,
                    refundAmount,
                    message: 'Session cancelled. Full refund will be processed.',
                });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('Reschedule respond error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input data', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process response' },
            { status: 500 }
        );
    }
}
