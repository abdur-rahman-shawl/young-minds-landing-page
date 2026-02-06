import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { z } from 'zod';

// Request body schema
const completeSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
    actualDuration: z.number().optional(),
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
 * POST /api/admin/sessions/[id]/complete
 * Force mark a session as completed
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
        const validationResult = completeSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                success: false,
                error: validationResult.error.errors[0]?.message || 'Invalid request'
            }, { status: 400 });
        }

        const { reason, actualDuration } = validationResult.data;

        // Get the session
        const [sessionData] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Check if session can be completed
        if (sessionData.status === 'completed') {
            return NextResponse.json({ success: false, error: 'Session is already completed' }, { status: 400 });
        }

        if (sessionData.status === 'cancelled') {
            return NextResponse.json({ success: false, error: 'Cannot complete a cancelled session' }, { status: 400 });
        }

        const previousStatus = sessionData.status;
        const originalDuration = sessionData.duration;

        // Update session
        const updateData: any = {
            status: 'completed',
            endedAt: new Date(),
            updatedAt: new Date(),
        };

        if (actualDuration !== undefined) {
            updateData.duration = actualDuration;
        }

        await db
            .update(sessions)
            .set(updateData)
            .where(eq(sessions.id, sessionId));

        // Log admin action
        await logAdminSessionAction({
            adminId: adminCheck.userId,
            sessionId,
            action: ADMIN_SESSION_ACTIONS.FORCE_COMPLETE,
            previousStatus,
            newStatus: 'completed',
            reason,
            details: {
                originalDuration,
                actualDuration: actualDuration || originalDuration,
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return NextResponse.json({
            success: true,
            message: 'Session marked as completed',
            data: {
                sessionId,
                previousStatus,
                newStatus: 'completed',
                duration: actualDuration || originalDuration,
            },
        });
    } catch (error) {
        console.error('Admin force complete error:', error);
        return NextResponse.json({ success: false, error: 'Failed to complete session' }, { status: 500 });
    }
}
