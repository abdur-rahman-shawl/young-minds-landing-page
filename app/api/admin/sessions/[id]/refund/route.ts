import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { z } from 'zod';

// Request body schema
const refundSchema = z.object({
    amount: z.number().min(0, 'Amount must be positive'),
    reason: z.string().min(1, 'Reason is required'),
    refundType: z.enum(['full', 'partial', 'bonus']).default('partial'),
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
 * POST /api/admin/sessions/[id]/refund
 * Issue a manual refund for a session
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
        const validationResult = refundSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                success: false,
                error: validationResult.error.errors[0]?.message || 'Invalid request'
            }, { status: 400 });
        }

        const { amount, reason, refundType } = validationResult.data;

        // Get the session
        const [sessionData] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        const originalRate = Number(sessionData.rate) || 0;
        const previousRefundAmount = Number(sessionData.refundAmount) || 0;

        // Calculate new total refund
        const newRefundAmount = refundType === 'bonus'
            ? previousRefundAmount + amount
            : amount;

        const refundPercentage = originalRate > 0
            ? Math.round((newRefundAmount / originalRate) * 100)
            : 0;

        // Update session
        await db
            .update(sessions)
            .set({
                refundAmount: newRefundAmount.toString(),
                refundPercentage: Math.min(refundPercentage, 100),
                refundStatus: 'pending',
                updatedAt: new Date(),
            })
            .where(eq(sessions.id, sessionId));

        // Log admin action
        await logAdminSessionAction({
            adminId: adminCheck.userId,
            sessionId,
            action: ADMIN_SESSION_ACTIONS.MANUAL_REFUND,
            reason,
            details: {
                refundAmount: amount,
                refundType,
                originalRate,
                previousRefundAmount,
                newTotalRefund: newRefundAmount,
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        // TODO: Send email notification
        // await sendAdminRefundIssuedEmail(...)

        return NextResponse.json({
            success: true,
            message: 'Refund issued successfully',
            data: {
                sessionId,
                refundAmount: newRefundAmount,
                refundPercentage: Math.min(refundPercentage, 100),
                refundType,
            },
        });
    } catch (error) {
        console.error('Admin manual refund error:', error);
        return NextResponse.json({ success: false, error: 'Failed to issue refund' }, { status: 500 });
    }
}
