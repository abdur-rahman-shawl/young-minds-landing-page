import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, users, rescheduleRequests, adminSessionNotes, adminSessionAuditTrail } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';

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
 * GET /api/admin/sessions/[id]
 * Get detailed session information for admin view
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await ensureAdmin(request);
        if ('error' in adminCheck) {
            return adminCheck.error;
        }

        const { id: sessionId } = await params;

        // Get session with basic info
        const [sessionData] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Get mentor info
        const [mentor] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, sessionData.mentorId))
            .limit(1);

        // Get mentee info
        const [mentee] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, sessionData.menteeId))
            .limit(1);

        // Get reschedule requests for this session
        const rescheduleRequestsData = await db
            .select()
            .from(rescheduleRequests)
            .where(eq(rescheduleRequests.sessionId, sessionId))
            .orderBy(desc(rescheduleRequests.createdAt));

        // Get admin notes for this session
        const adminNotes = await db
            .select({
                id: adminSessionNotes.id,
                note: adminSessionNotes.note,
                createdAt: adminSessionNotes.createdAt,
                adminId: adminSessionNotes.adminId,
            })
            .from(adminSessionNotes)
            .where(eq(adminSessionNotes.sessionId, sessionId))
            .orderBy(desc(adminSessionNotes.createdAt));

        // Get admin notes with admin name
        const adminIds = [...new Set(adminNotes.map(n => n.adminId).filter(Boolean))];
        let adminMap: Map<string, { name: string | null }> = new Map();

        if (adminIds.length > 0) {
            const admins = await db
                .select({ id: users.id, name: users.name })
                .from(users)
                .where(eq(users.id, adminIds[0])); // Simplified for single admin
            admins.forEach(a => adminMap.set(a.id, { name: a.name }));
        }

        const enrichedNotes = adminNotes.map(note => ({
            ...note,
            createdAt: note.createdAt?.toISOString(),
            adminName: note.adminId ? adminMap.get(note.adminId)?.name : null,
        }));

        // Get admin actions for this session
        const adminActions = await db
            .select()
            .from(adminSessionAuditTrail)
            .where(eq(adminSessionAuditTrail.sessionId, sessionId))
            .orderBy(desc(adminSessionAuditTrail.createdAt))
            .limit(50);

        // Enrich admin actions with admin names
        const actionAdminIds = [...new Set(adminActions.map(a => a.adminId).filter(Boolean))];
        let actionAdminMap: Map<string, { name: string | null }> = new Map();

        if (actionAdminIds.length > 0) {
            const actionAdmins = await db
                .select({ id: users.id, name: users.name })
                .from(users)
                .where(eq(users.id, actionAdminIds[0])); // Simplified
            actionAdmins.forEach(a => actionAdminMap.set(a.id, { name: a.name }));
        }

        const enrichedActions = adminActions.map(action => ({
            ...action,
            createdAt: action.createdAt?.toISOString(),
            adminName: action.adminId ? actionAdminMap.get(action.adminId)?.name : null,
        }));

        return NextResponse.json({
            success: true,
            data: {
                session: {
                    ...sessionData,
                    scheduledAt: sessionData.scheduledAt?.toISOString(),
                    startedAt: sessionData.startedAt?.toISOString(),
                    endedAt: sessionData.endedAt?.toISOString(),
                    createdAt: sessionData.createdAt?.toISOString(),
                    updatedAt: sessionData.updatedAt?.toISOString(),
                    noShowMarkedAt: sessionData.noShowMarkedAt?.toISOString(),
                    reassignedAt: sessionData.reassignedAt?.toISOString(),
                    pendingRescheduleTime: sessionData.pendingRescheduleTime?.toISOString(),
                },
                mentor,
                mentee,
                rescheduleRequests: rescheduleRequestsData.map(r => ({
                    ...r,
                    proposedTime: r.proposedTime?.toISOString(),
                    originalTime: r.originalTime?.toISOString(),
                    counterProposedTime: r.counterProposedTime?.toISOString(),
                    expiresAt: r.expiresAt?.toISOString(),
                    createdAt: r.createdAt?.toISOString(),
                    updatedAt: r.updatedAt?.toISOString(),
                })),
                adminNotes: enrichedNotes,
                adminActions: enrichedActions,
            },
        });
    } catch (error) {
        console.error('Admin session detail error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch session details' }, { status: 500 });
    }
}
