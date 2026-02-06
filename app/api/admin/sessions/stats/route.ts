import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, reviews } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, count, sum, avg } from 'drizzle-orm';
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
 * GET /api/admin/sessions/stats
 * Get dashboard statistics for admin sessions view
 */
export async function GET(request: NextRequest) {
    try {
        const adminCheck = await ensureAdmin(request);
        if ('error' in adminCheck) {
            return adminCheck.error;
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build date conditions
        const dateConditions = [];
        if (startDate) {
            dateConditions.push(gte(sessions.createdAt, new Date(startDate)));
        }
        if (endDate) {
            dateConditions.push(lte(sessions.createdAt, new Date(endDate)));
        }
        const dateWhere = dateConditions.length > 0 ? and(...dateConditions) : undefined;

        // Total sessions
        const [{ totalSessions }] = await db
            .select({ totalSessions: count() })
            .from(sessions)
            .where(dateWhere);

        // Sessions by status
        const statusCounts = await db
            .select({
                status: sessions.status,
                count: count(),
            })
            .from(sessions)
            .where(dateWhere)
            .groupBy(sessions.status);

        const statusMap: Record<string, number> = {};
        statusCounts.forEach(({ status, count }) => {
            statusMap[status] = count;
        });

        const completedSessions = statusMap['completed'] || 0;
        const cancelledSessions = statusMap['cancelled'] || 0;
        const noShowCount = statusMap['no_show'] || 0;
        const scheduledSessions = statusMap['scheduled'] || 0;
        const inProgressSessions = statusMap['in_progress'] || 0;

        // No-show rate
        const noShowRate = totalSessions > 0
            ? Math.round((noShowCount / totalSessions) * 10000) / 100
            : 0;

        // Revenue calculations
        const [revenueData] = await db
            .select({
                totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.status} = 'completed' THEN CAST(${sessions.rate} AS DECIMAL) ELSE 0 END), 0)`,
                refundsIssued: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.refundStatus} = 'processed' THEN CAST(${sessions.refundAmount} AS DECIMAL) ELSE 0 END), 0)`,
            })
            .from(sessions)
            .where(dateWhere);

        const totalRevenue = Number(revenueData?.totalRevenue) || 0;
        const refundsIssued = Number(revenueData?.refundsIssued) || 0;
        const netRevenue = totalRevenue - refundsIssued;

        // Sessions scheduled today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [{ sessionsToday }] = await db
            .select({ sessionsToday: count() })
            .from(sessions)
            .where(and(
                gte(sessions.scheduledAt, today),
                lte(sessions.scheduledAt, tomorrow)
            ));

        // Pending reschedule requests
        const [{ pendingReschedules }] = await db
            .select({ pendingReschedules: count() })
            .from(sessions)
            .where(sql`${sessions.pendingRescheduleRequestId} IS NOT NULL`);

        // Cancellations by role
        const cancellationsByRole = await db
            .select({
                cancelledBy: sessions.cancelledBy,
                count: count(),
            })
            .from(sessions)
            .where(and(
                eq(sessions.status, 'cancelled'),
                dateWhere
            ))
            .groupBy(sessions.cancelledBy);

        const cancellationsByMentor = cancellationsByRole.find(r => r.cancelledBy === 'mentor')?.count || 0;
        const cancellationsByMentee = cancellationsByRole.find(r => r.cancelledBy === 'mentee')?.count || 0;

        // Average session rating (from reviews table)
        let avgSessionRating = 0;
        try {
            const [ratingData] = await db
                .select({ avgRating: avg(reviews.rating) })
                .from(reviews)
                .where(dateWhere ? sql`${reviews.createdAt} >= ${startDate} AND ${reviews.createdAt} <= ${endDate}` : undefined);
            avgSessionRating = Number(ratingData?.avgRating) || 0;
        } catch (e) {
            // Reviews table might not exist or different structure
            avgSessionRating = 0;
        }

        // Status breakdown for chart
        const statusBreakdown = [
            { status: 'scheduled', count: scheduledSessions },
            { status: 'in_progress', count: inProgressSessions },
            { status: 'completed', count: completedSessions },
            { status: 'cancelled', count: cancelledSessions },
            { status: 'no_show', count: noShowCount },
        ].filter(s => s.count > 0);

        // Sessions over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sessionsOverTime = await db
            .select({
                date: sql<string>`DATE(${sessions.createdAt})`,
                count: count(),
            })
            .from(sessions)
            .where(gte(sessions.createdAt, thirtyDaysAgo))
            .groupBy(sql`DATE(${sessions.createdAt})`)
            .orderBy(sql`DATE(${sessions.createdAt})`);

        return NextResponse.json({
            success: true,
            data: {
                totalSessions,
                completedSessions,
                cancelledSessions,
                noShowCount,
                noShowRate,
                avgSessionRating: Math.round(avgSessionRating * 10) / 10,
                totalRevenue,
                refundsIssued,
                netRevenue,
                sessionsToday,
                pendingReschedules,
                cancellationsByMentor,
                cancellationsByMentee,
                statusBreakdown,
                sessionsOverTime: sessionsOverTime.map(s => ({
                    date: s.date,
                    count: s.count,
                })),
            },
        });
    } catch (error) {
        console.error('Admin sessions stats error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch session stats' }, { status: 500 });
    }
}
