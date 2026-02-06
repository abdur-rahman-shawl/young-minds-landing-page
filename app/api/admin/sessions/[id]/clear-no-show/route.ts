import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { z } from 'zod';

// Request body schema
const clearNoShowSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
    restoreStatus: z.enum(['completed', 'cancelled']).default('completed'),
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
 * POST /api/admin/sessions/[id]/clear-no-show
 * Clear an incorrect no-show flag from a session
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
        const validationResult = clearNoShowSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                success: false,
                error: validationResult.error.errors[0]?.message || 'Invalid request'
            }, { status: 400 });
        }

        const { reason, restoreStatus } = validationResult.data;

        // Get the session
        const [sessionData] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Check if session is actually marked as no-show
        if (sessionData.status !== 'no_show') {
            return NextResponse.json({
                success: false,
                error: 'Session is not marked as no-show'
            }, { status: 400 });
        }

        const previousStatus = sessionData.status;

        // Update session
        await db
            .update(sessions)
            .set({
                status: restoreStatus,
                noShowMarkedBy: null,
                noShowMarkedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(sessions.id, sessionId));

        // Log admin action
        await logAdminSessionAction({
            adminId: adminCheck.userId,
            sessionId,
            action: ADMIN_SESSION_ACTIONS.CLEAR_NO_SHOW,
            previousStatus,
            newStatus: restoreStatus,
            reason,
            details: {
                originalNoShowMarkedBy: sessionData.noShowMarkedBy,
                originalNoShowMarkedAt: sessionData.noShowMarkedAt?.toISOString(),
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return NextResponse.json({
            success: true,
            message: 'No-show flag cleared successfully',
            data: {
                sessionId,
                previousStatus,
                newStatus: restoreStatus,
            },
        });
    } catch (error) {
        console.error('Admin clear no-show error:', error);
        return NextResponse.json({ success: false, error: 'Failed to clear no-show flag' }, { status: 500 });
    }
}
