import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, users, mentors } from '@/lib/db/schema';
import { eq, and, ne, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { z } from 'zod';

// Request body schema
const reassignSchema = z.object({
    newMentorId: z.string().min(1, 'New mentor ID is required'),
    reason: z.string().min(1, 'Reason is required'),
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
 * POST /api/admin/sessions/[id]/reassign
 * Reassign a session to a different mentor
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
        const validationResult = reassignSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                success: false,
                error: validationResult.error.errors[0]?.message || 'Invalid request'
            }, { status: 400 });
        }

        const { newMentorId, reason, notifyParties } = validationResult.data;

        // Get the session
        const [sessionData] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Check if session can be reassigned
        if (sessionData.status === 'completed') {
            return NextResponse.json({ success: false, error: 'Cannot reassign a completed session' }, { status: 400 });
        }

        if (sessionData.status === 'cancelled') {
            return NextResponse.json({ success: false, error: 'Cannot reassign a cancelled session' }, { status: 400 });
        }

        // Verify new mentor exists and is verified
        const [newMentor] = await db
            .select({
                id: mentors.id,
                userId: mentors.userId,
                verificationStatus: mentors.verificationStatus,
            })
            .from(mentors)
            .where(eq(mentors.userId, newMentorId))
            .limit(1);

        if (!newMentor) {
            return NextResponse.json({ success: false, error: 'New mentor not found' }, { status: 404 });
        }

        if (newMentor.verificationStatus !== 'VERIFIED') {
            return NextResponse.json({ success: false, error: 'New mentor is not verified' }, { status: 400 });
        }

        // Get previous mentor info
        const [previousMentor] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, sessionData.mentorId))
            .limit(1);

        // Get new mentor info
        const [newMentorUser] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, newMentorId))
            .limit(1);

        const previousMentorId = sessionData.mentorId;

        // Update session
        await db
            .update(sessions)
            .set({
                mentorId: newMentorId,
                wasReassigned: true,
                reassignedFromMentorId: previousMentorId,
                reassignedAt: new Date(),
                reassignmentStatus: 'accepted', // Admin override - no approval needed
                updatedAt: new Date(),
            })
            .where(eq(sessions.id, sessionId));

        // Log admin action
        await logAdminSessionAction({
            adminId: adminCheck.userId,
            sessionId,
            action: ADMIN_SESSION_ACTIONS.REASSIGN_SESSION,
            reason,
            details: {
                previousMentorId,
                previousMentorName: previousMentor?.name,
                newMentorId,
                newMentorName: newMentorUser?.name,
                notificationsSent: notifyParties,
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        // TODO: Send email notifications if notifyParties is true
        // await sendAdminReassignedToMenteeEmail(...)
        // await sendAdminAssignedToMentorEmail(...)

        return NextResponse.json({
            success: true,
            message: 'Session reassigned successfully',
            data: {
                sessionId,
                previousMentor: previousMentor?.name,
                newMentor: newMentorUser?.name,
            },
        });
    } catch (error) {
        console.error('Admin reassign error:', error);
        return NextResponse.json({ success: false, error: 'Failed to reassign session' }, { status: 500 });
    }
}
