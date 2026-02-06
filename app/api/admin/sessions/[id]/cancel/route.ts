import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { z } from 'zod';

// Request body schema
const cancelSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
    refundPercentage: z.number().min(0).max(100).default(100),
    notifyParties: z.boolean().default(true),
});

/**
 * Ensure the request is from an admin user
 */
async function ensureAdmin(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
            return { error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
        }

        const userWithRoles = await getUserWithRoles(session.user.id);
        const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

        if (!isAdmin) {
            return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
        }

        return { session, userId: session.user.id };
    } catch (error) {
        console.error('Admin auth check failed:', error);
        return { error: NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 }) };
    }
}

/**
 * POST /api/admin/sessions/[id]/cancel
 * Force cancel a session as admin
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await ensureAdmin(request);
        if ('error' in adminCheck) {
            return adminCheck.error;
        }

        const { id: sessionId } = await params;
        const body = await request.json();

        // Validate request body
        const validationResult = cancelSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                success: false,
                error: validationResult.error.errors[0]?.message || 'Invalid request'
            }, { status: 400 });
        }

        const { reason, refundPercentage, notifyParties } = validationResult.data;

        // Get the session
        const [sessionData] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Check if session can be cancelled
        if (sessionData.status === 'cancelled') {
            return NextResponse.json({ success: false, error: 'Session is already cancelled' }, { status: 400 });
        }

        if (sessionData.status === 'completed') {
            return NextResponse.json({ success: false, error: 'Cannot cancel a completed session' }, { status: 400 });
        }

        const previousStatus = sessionData.status;

        // Calculate refund amount
        const rate = Number(sessionData.rate) || 0;
        const refundAmount = (rate * refundPercentage) / 100;

        // Update session
        await db
            .update(sessions)
            .set({
                status: 'cancelled',
                cancelledBy: 'admin',
                cancellationReason: reason,
                refundAmount: refundAmount.toString(),
                refundPercentage: refundPercentage,
                refundStatus: refundPercentage > 0 ? 'pending' : 'none',
                updatedAt: new Date(),
            })
            .where(eq(sessions.id, sessionId));

        // Log admin action
        await logAdminSessionAction({
            adminId: adminCheck.userId,
            sessionId,
            action: ADMIN_SESSION_ACTIONS.FORCE_CANCEL,
            previousStatus,
            newStatus: 'cancelled',
            reason,
            details: {
                refundPercentage,
                refundAmount,
                notificationsSent: notifyParties,
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        // TODO: Send email notifications if notifyParties is true
        // await sendAdminCancelledSessionEmail(...)

        // Get mentor and mentee info for response
        const [mentor] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, sessionData.mentorId))
            .limit(1);

        const [mentee] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, sessionData.menteeId))
            .limit(1);

        return NextResponse.json({
            success: true,
            message: 'Session cancelled successfully',
            data: {
                sessionId,
                previousStatus,
                newStatus: 'cancelled',
                refundAmount,
                refundPercentage,
                mentor: mentor?.name,
                mentee: mentee?.name,
            },
        });
    } catch (error) {
        console.error('Admin force cancel error:', error);
        return NextResponse.json({ success: false, error: 'Failed to cancel session' }, { status: 500 });
    }
}
