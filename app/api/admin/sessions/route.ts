import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { eq, desc, asc, and, or, gte, lte, like, sql, count } from 'drizzle-orm';
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

        return { session };
    } catch (error) {
        console.error('Admin auth check failed:', error);
        return { error: NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 }) };
    }
}

/**
 * GET /api/admin/sessions
 * Fetch all sessions with pagination, filtering, and sorting
 */
export async function GET(request: NextRequest) {
    try {
        const adminCheck = await ensureAdmin(request);
        if ('error' in adminCheck) {
            return adminCheck.error;
        }

        const { searchParams } = new URL(request.url);

        // Pagination
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const offset = (page - 1) * limit;

        // Filters
        const status = searchParams.get('status'); // comma-separated
        const mentorId = searchParams.get('mentorId');
        const menteeId = searchParams.get('menteeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const meetingType = searchParams.get('meetingType');
        const refundStatus = searchParams.get('refundStatus');
        const wasReassigned = searchParams.get('wasReassigned');
        const search = searchParams.get('search');

        // Sorting
        const sortBy = searchParams.get('sortBy') || 'scheduledAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build conditions
        const conditions = [];

        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            if (statuses.length === 1) {
                conditions.push(eq(sessions.status, statuses[0]));
            } else {
                conditions.push(or(...statuses.map(s => eq(sessions.status, s))));
            }
        }

        if (mentorId) {
            conditions.push(eq(sessions.mentorId, mentorId));
        }

        if (menteeId) {
            conditions.push(eq(sessions.menteeId, menteeId));
        }

        if (startDate) {
            conditions.push(gte(sessions.scheduledAt, new Date(startDate)));
        }

        if (endDate) {
            conditions.push(lte(sessions.scheduledAt, new Date(endDate)));
        }

        if (meetingType) {
            conditions.push(eq(sessions.meetingType, meetingType));
        }

        if (refundStatus) {
            conditions.push(eq(sessions.refundStatus, refundStatus));
        }

        if (wasReassigned === 'true') {
            conditions.push(eq(sessions.wasReassigned, true));
        }

        // Build where clause
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [{ totalCount }] = await db
            .select({ totalCount: count() })
            .from(sessions)
            .where(whereClause);

        // Get sessions with mentor and mentee info
        const mentorAlias = db.$with('mentor').as(
            db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
            }).from(users)
        );

        const menteeAlias = db.$with('mentee').as(
            db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
            }).from(users)
        );

        // Query sessions with user info
        const sessionsData = await db
            .select({
                id: sessions.id,
                mentorId: sessions.mentorId,
                menteeId: sessions.menteeId,
                title: sessions.title,
                description: sessions.description,
                status: sessions.status,
                scheduledAt: sessions.scheduledAt,
                startedAt: sessions.startedAt,
                endedAt: sessions.endedAt,
                duration: sessions.duration,
                meetingUrl: sessions.meetingUrl,
                meetingType: sessions.meetingType,
                rate: sessions.rate,
                currency: sessions.currency,
                cancelledBy: sessions.cancelledBy,
                cancellationReason: sessions.cancellationReason,
                rescheduleCount: sessions.rescheduleCount,
                mentorRescheduleCount: sessions.mentorRescheduleCount,
                refundAmount: sessions.refundAmount,
                refundPercentage: sessions.refundPercentage,
                refundStatus: sessions.refundStatus,
                wasReassigned: sessions.wasReassigned,
                reassignmentStatus: sessions.reassignmentStatus,
                pendingRescheduleBy: sessions.pendingRescheduleBy,
                createdAt: sessions.createdAt,
                updatedAt: sessions.updatedAt,
            })
            .from(sessions)
            .where(whereClause)
            .orderBy(sortOrder === 'asc' ? asc(sessions.scheduledAt) : desc(sessions.scheduledAt))
            .limit(limit)
            .offset(offset);

        // Fetch mentor and mentee info for each session
        const mentorIds = [...new Set(sessionsData.map(s => s.mentorId))];
        const menteeIds = [...new Set(sessionsData.map(s => s.menteeId))];
        const allUserIds = [...new Set([...mentorIds, ...menteeIds])];

        const usersData = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
            })
            .from(users)
            .where(or(...allUserIds.map(id => eq(users.id, id))));

        const usersMap = new Map(usersData.map(u => [u.id, u]));

        // Combine session data with user info
        const enrichedSessions = sessionsData.map(session => ({
            ...session,
            scheduledAt: session.scheduledAt?.toISOString(),
            startedAt: session.startedAt?.toISOString(),
            endedAt: session.endedAt?.toISOString(),
            createdAt: session.createdAt?.toISOString(),
            updatedAt: session.updatedAt?.toISOString(),
            mentor: usersMap.get(session.mentorId) || null,
            mentee: usersMap.get(session.menteeId) || null,
        }));

        return NextResponse.json({
            success: true,
            data: {
                sessions: enrichedSessions,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                },
            },
        });
    } catch (error) {
        console.error('Admin sessions GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
    }
}
