import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, notifications, sessionPolicies, sessionAuditLog, mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { CANCELLATION_REASONS, MENTOR_CANCELLATION_REASONS, DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';
import { findAvailableReplacementMentor } from '@/lib/services/mentor-matching';

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

// Calculate refund percentage based on timing and role
function calculateRefundPercentage(
    isMentor: boolean,
    hoursUntilSession: number,
    policies: {
        freeCancellationHours: number;
        cancellationCutoffHours: number;
        partialRefundPercentage: number;
        lateCancellationRefundPercentage: number;
    }
): number {
    // Mentor cancels → always 100% refund to mentee (unless reassigned)
    if (isMentor) return 100;

    // Session is in the past → no refund
    if (hoursUntilSession <= 0) return 0;

    // Mentee cancels before free cancellation window → 100%
    if (hoursUntilSession >= policies.freeCancellationHours) return 100;

    // Mentee cancels between free and cutoff → partial refund
    if (hoursUntilSession >= policies.cancellationCutoffHours) {
        return policies.partialRefundPercentage;
    }

    // Mentee cancels after cutoff → late refund (typically 0%)
    return policies.lateCancellationRefundPercentage;
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

        // Load all relevant policies from DB
        const [
            menteeCancellationCutoffHours,
            mentorCancellationCutoffHours,
            freeCancellationHours,
            partialRefundPercentage,
            lateCancellationRefundPercentage,
        ] = await Promise.all([
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.CANCELLATION_CUTOFF_HOURS.key,
                DEFAULT_SESSION_POLICIES.CANCELLATION_CUTOFF_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.MENTOR_CANCELLATION_CUTOFF_HOURS.key,
                DEFAULT_SESSION_POLICIES.MENTOR_CANCELLATION_CUTOFF_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.FREE_CANCELLATION_HOURS.key,
                DEFAULT_SESSION_POLICIES.FREE_CANCELLATION_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.PARTIAL_REFUND_PERCENTAGE.key,
                DEFAULT_SESSION_POLICIES.PARTIAL_REFUND_PERCENTAGE.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.LATE_CANCELLATION_REFUND_PERCENTAGE.key,
                DEFAULT_SESSION_POLICIES.LATE_CANCELLATION_REFUND_PERCENTAGE.value
            ),
        ]);

        // Get role-specific cutoff
        const cancellationCutoffHours = isMentor
            ? parseInt(mentorCancellationCutoffHours)
            : parseInt(menteeCancellationCutoffHours);

        // Check cancellation time constraints
        const scheduledTime = new Date(booking.scheduledAt);
        const now = new Date();
        const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Only block mentee cancellations after cutoff (mentors can always cancel)
        if (!isMentor && hoursUntilSession < cancellationCutoffHours && hoursUntilSession > 0) {
            return NextResponse.json(
                { error: `Mentees cannot cancel sessions within ${cancellationCutoffHours} hour(s) of the scheduled time` },
                { status: 400 }
            );
        }

        // =========================================================================================
        // MENTOR REASSIGNMENT LOGIC
        // =========================================================================================
        if (isMentor) {
            // Attempt to find a replacement mentor
            const newMentorId = await findAvailableReplacementMentor(
                booking.scheduledAt,
                booking.duration,
                session.user.id
            );

            if (newMentorId) {
                // Fetch new mentor details for notification
                const [newMentorUser] = await db
                    .select({ name: users.name })
                    .from(mentors)
                    .innerJoin(users, eq(mentors.userId, users.id))
                    .where(eq(mentors.userId, newMentorId))
                    .limit(1);

                const newMentorName = newMentorUser?.name || 'Another Mentor';

                // Reassign session
                // Build the cancelled mentors list (original mentor + any previous)
                const existingCancelledMentors = (booking.cancelledMentorIds as string[]) || [];
                const updatedCancelledMentors = [...existingCancelledMentors, booking.mentorId];

                const [updatedBooking] = await db
                    .update(sessions)
                    .set({
                        mentorId: newMentorId,
                        mentorNotes: `Auto-reassigned from original mentor (${session.user.name || 'Unknown'}) who cancelled due to: ${reasonCategory}`,
                        // Reassignment tracking
                        wasReassigned: true,
                        reassignedFromMentorId: booking.mentorId,
                        reassignedAt: new Date(),
                        reassignmentStatus: 'pending_acceptance',
                        cancelledMentorIds: updatedCancelledMentors,
                        updatedAt: new Date(),
                    })
                    .where(eq(sessions.id, id))
                    .returning();

                // Notify Mentee
                await db.insert(notifications).values({
                    userId: booking.menteeId,
                    type: 'SESSION_REASSIGNED',
                    title: 'Mentor Changed - Your Session Has Been Reassigned',
                    message: `Your original mentor for "${booking.title}" had to cancel. You've been reassigned to ${newMentorName}. You can continue with the new mentor or cancel for a full refund.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=sessions`,
                    actionText: 'View Options',
                });

                // Notify Old Mentor (Cancellation Confirmed)
                await db.insert(notifications).values({
                    userId: booking.mentorId,
                    type: 'BOOKING_CANCELLED',
                    title: 'Session Cancelled & Reassigned',
                    message: `You cancelled "${booking.title}". The session was successfully reassigned to another mentor.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=schedule`,
                    actionText: 'View Schedule',
                });

                // Notify New Mentor
                await db.insert(notifications).values({
                    userId: newMentorId,
                    type: 'BOOKING_REQUEST',
                    title: 'New Session Assigned (Reassignment)',
                    message: `You have been assigned an urgent session "${booking.title}" (Reassigned from another mentor).`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=schedule`,
                    actionText: 'View Session',
                });

                // Audit Log
                await db.insert(sessionAuditLog).values({
                    sessionId: booking.id,
                    userId: session.user.id,
                    action: 'reassignment', // Custom action for this case
                    reasonCategory: reasonCategory,
                    reasonDetails: reasonDetails,
                    policySnapshot: {
                        originalMentor: booking.mentorId,
                        newMentor: newMentorId,
                        reason: 'Auto-reassignment after mentor cancellation'
                    },
                    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
                    userAgent: req.headers.get('user-agent') || 'unknown',
                });

                return NextResponse.json({
                    success: true,
                    reassigned: true,
                    newMentorName,
                    booking: updatedBooking,
                    message: `Session reassigned to ${newMentorName}.`
                });
            } else {
                // NO REPLACEMENT MENTOR FOUND
                // Instead of cancelling, set status to awaiting_mentee_choice so mentee can browse alternatives
                const existingCancelledMentors = (booking.cancelledMentorIds as string[]) || [];
                const updatedCancelledMentors = [...existingCancelledMentors, booking.mentorId];

                const [updatedBooking] = await db
                    .update(sessions)
                    .set({
                        // Clear the mentor since they cancelled
                        mentorId: booking.mentorId, // Keep original for now, mentee will select new one
                        mentorNotes: `Original mentor (${session.user.name || 'Unknown'}) cancelled: ${reasonCategory}. Awaiting mentee to select new mentor.`,
                        wasReassigned: false, // Not auto-reassigned
                        reassignedFromMentorId: booking.mentorId,
                        reassignmentStatus: 'awaiting_mentee_choice',
                        cancelledMentorIds: updatedCancelledMentors,
                        cancelledBy: 'mentor',
                        cancellationReason: reasonDetails || reasonCategory,
                        updatedAt: new Date(),
                    })
                    .where(eq(sessions.id, id))
                    .returning();

                // Notify Mentee - need to browse and select
                await db.insert(notifications).values({
                    userId: booking.menteeId,
                    type: 'SESSION_MENTOR_CANCELLED',
                    title: 'Your Mentor Cancelled - Action Required',
                    message: `Your mentor for "${booking.title}" has cancelled. No immediate replacement was found. Please browse other mentors or cancel for a full refund.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/sessions/${booking.id}/select-mentor`,
                    actionText: 'Browse Mentors',
                });

                // Notify Old Mentor (Cancellation Confirmed)
                await db.insert(notifications).values({
                    userId: booking.mentorId,
                    type: 'BOOKING_CANCELLED',
                    title: 'Session Cancellation Confirmed',
                    message: `You cancelled "${booking.title}". The mentee has been notified to find a new mentor.`,
                    relatedId: booking.id,
                    relatedType: 'session',
                    actionUrl: `/dashboard?section=schedule`,
                    actionText: 'View Schedule',
                });

                // Audit Log
                await db.insert(sessionAuditLog).values({
                    sessionId: booking.id,
                    userId: session.user.id,
                    action: 'mentor_cancelled_no_replacement',
                    reasonCategory: reasonCategory,
                    reasonDetails: reasonDetails,
                    policySnapshot: {
                        originalMentor: booking.mentorId,
                        newStatus: 'awaiting_mentee_choice',
                        reason: 'Mentor cancelled, no auto-replacement available'
                    },
                    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
                    userAgent: req.headers.get('user-agent') || 'unknown',
                });

                return NextResponse.json({
                    success: true,
                    reassigned: false,
                    awaitingMenteeChoice: true,
                    booking: updatedBooking,
                    message: `No replacement mentor available. The mentee has been notified to select a new mentor.`
                });
            }
        }
        // =========================================================================================

        // FALLBACK / STANDARD CANCELLATION (Mentee cancels)

        // Calculate refund
        const refundPercentage = calculateRefundPercentage(isMentor, hoursUntilSession, {
            freeCancellationHours: parseInt(freeCancellationHours),
            cancellationCutoffHours,
            partialRefundPercentage: parseInt(partialRefundPercentage),
            lateCancellationRefundPercentage: parseInt(lateCancellationRefundPercentage),
        });

        const sessionRate = booking.rate ? parseFloat(booking.rate) : 0;
        const refundAmount = (sessionRate * refundPercentage) / 100;

        // Determine which reason list to use for label lookup
        const reasonList = isMentor ? MENTOR_CANCELLATION_REASONS : CANCELLATION_REASONS;
        const reasonLabel = reasonList.find(r => r.value === reasonCategory)?.label || reasonCategory;
        const fullReason = reasonDetails ? `${reasonLabel}: ${reasonDetails}` : reasonLabel;

        // Determine who cancelled
        const cancelledBy = isMentor ? 'mentor' : 'mentee';

        // Update the booking with refund info
        const [cancelledBooking] = await db
            .update(sessions)
            .set({
                status: 'cancelled',
                cancelledBy: cancelledBy,
                cancellationReason: fullReason,
                refundPercentage: refundPercentage,
                refundAmount: refundAmount.toFixed(2),
                refundStatus: refundAmount > 0 ? 'pending' : 'none',
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
                freeCancellationHours: parseInt(freeCancellationHours),
                partialRefundPercentage: parseInt(partialRefundPercentage),
                lateCancellationRefundPercentage: parseInt(lateCancellationRefundPercentage),
                hoursUntilSession: Math.round(hoursUntilSession * 100) / 100,
                cancelledBy,
                refundPercentage,
                refundAmount,
            },
            ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
        });

        // Build refund message for notifications
        const refundMessage = refundAmount > 0
            ? ` A refund of ${refundPercentage}% ($${refundAmount.toFixed(2)}) will be processed.`
            : '';

        // Notify the other party
        if (isMentor) {
            // Mentor cancelled (and NO replacement found) -> notify mentee
            await db.insert(notifications).values({
                userId: booking.menteeId,
                type: 'BOOKING_CANCELLED',
                title: 'Session Cancelled by Mentor',
                message: `Your session "${booking.title}" has been cancelled by the mentor. Reason: ${fullReason}${refundMessage}`,
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
                message: `You have cancelled the session "${booking.title}". The mentee will receive a full refund.`,
                relatedId: booking.id,
                relatedType: 'session',
                actionUrl: `/dashboard?section=schedule`,
                actionText: 'View Schedule',
            });
        } else {
            // Mentee cancelled -> notify mentor
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

            // Confirmation to mentee with refund info
            await db.insert(notifications).values({
                userId: booking.menteeId,
                type: 'BOOKING_CANCELLED',
                title: 'Session Cancellation Confirmed',
                message: `Your session "${booking.title}" has been cancelled.${refundMessage}`,
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
            refundPercentage,
            refundAmount,
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
