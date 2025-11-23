import { db } from '@/lib/db';
import { sessions, users, userRoles, roles, reviews, messages } from '@/lib/db/schema';
import { and, eq, gte, lte, desc, sql, count, avg, sum, isNull } from 'drizzle-orm';

// =================================================================
// ADMIN DASHBOARD QUERIES (Platform-Wide)
// =================================================================

// Helper to get previous date range for comparisons
const getPreviousDateRange = (startDate: Date, endDate: Date) => {
  const duration = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - duration);
  return { prevStartDate, prevEndDate };
};

export async function getAdminDashboardKpis(startDate: Date, endDate: Date) {
  const { prevStartDate, prevEndDate } = getPreviousDateRange(startDate, endDate);

  // The fix is to add .toISOString() to every date variable in the query.
  const [kpiResult] = await db.execute(sql`
    SELECT
      (SELECT COUNT(DISTINCT s.mentee_id) FROM sessions s WHERE s.status = 'completed' AND s.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}) AS "currentActiveMentees",
      (SELECT COUNT(DISTINCT s.mentee_id) FROM sessions s WHERE s.status = 'completed' AND s.created_at BETWEEN ${prevStartDate.toISOString()} AND ${prevEndDate.toISOString()}) AS "previousActiveMentees",
      (SELECT COUNT(id) FROM sessions WHERE created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}) AS "currentSessions",
      (SELECT COUNT(id) FROM sessions WHERE created_at BETWEEN ${prevStartDate.toISOString()} AND ${prevEndDate.toISOString()}) AS "previousSessions",
      (SELECT AVG(r.final_score) FROM reviews r JOIN sessions s ON r.session_id = s.id WHERE r.reviewer_role = 'mentee' AND s.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}) AS "averageRating",
      (SELECT COUNT(id) FROM sessions WHERE created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()} AND rate > 0) AS "paidSessions"
  `);

  const currentSessions = Number(kpiResult.currentSessions ?? 0);
  const paidSessions = Number(kpiResult.paidSessions ?? 0);
  const paidConversionRate = currentSessions > 0 ? (paidSessions / currentSessions) * 100 : 0;

  return {
    activeMentees: {
      current: Number(kpiResult.currentActiveMentees ?? 0),
      previous: Number(kpiResult.previousActiveMentees ?? 0),
    },
    totalSessions: {
      current: currentSessions,
      previous: Number(kpiResult.previousSessions ?? 0),
    },
    averageSessionRating: parseFloat(kpiResult.averageRating ?? '0'),
    paidConversionRate: parseFloat(paidConversionRate.toFixed(1)),
  };
}

export async function getAdminSessionsOverTime(startDate: Date, endDate: Date) {
  const result = await db
    .select({
      date: sql<string>`DATE(created_at)`.as('date'),
      sessions: count(sessions.id),
    })
    .from(sessions)
    .where(and(gte(sessions.createdAt, startDate), lte(sessions.createdAt, endDate)))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  return result.map((r: { date: string | number | Date; }) => ({ ...r, date: new Date(r.date).toISOString().split('T')[0] }));
}

export async function getAdminMentorLeaderboard(limit: number = 5) {
    return db
        .select({
            mentorId: users.id,
            name: users.name,
            sessionsCompleted: sql<number>`COUNT(DISTINCT ${sessions.id})`.mapWith(Number),
            averageRating: sql<number>`AVG(${reviews.finalScore})`.mapWith(Number),
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.name, 'mentor')))
        .leftJoin(sessions, and(eq(users.id, sessions.mentorId), eq(sessions.status, 'completed')))
        .leftJoin(reviews, and(eq(users.id, reviews.revieweeId), eq(reviews.reviewerRole, 'mentee')))
        .groupBy(users.id, users.name)
        // === THIS IS THE CORRECTED RANKING LOGIC ===
        .orderBy(
            // 1. Sort by session count first (descending)
            desc(sql<number>`COUNT(DISTINCT ${sessions.id})`),
            // 2. Then, sort by average rating as a tie-breaker (descending)
            // COALESCE is used to treat mentors with no reviews (NULL rating) as 0 for sorting purposes.
            desc(sql<number>`COALESCE(AVG(${reviews.finalScore}), 0)`)
        )
        .limit(limit);
}


// =================================================================
// MENTOR DASHBOARD QUERIES (Scoped to a single Mentor)
// =================================================================

export interface MentorDashboardStats {
  completedSessions: number;
  upcomingSessions: number;
  totalEarnings: number;
  periodEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  unreadMessages: number;
}

/**
 * REFACTORED & OPTIMIZED: Fetches all key stats for a mentor's dashboard
 * in a single, efficient database query.
 */
export async function getMentorDashboardStats(mentorId: string, startDate: Date, endDate: Date): Promise<MentorDashboardStats> {
  
  // This single, raw SQL query is more robust and avoids the subquery alias issue.
  const [result] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM sessions WHERE mentor_id = ${mentorId} AND status = 'completed') AS "completedSessions",
      (SELECT COUNT(*) FROM sessions WHERE mentor_id = ${mentorId} AND status = 'scheduled' AND scheduled_at > NOW()) AS "upcomingSessions",
      (SELECT COALESCE(SUM(rate), 0) FROM sessions WHERE mentor_id = ${mentorId} AND status = 'completed') AS "totalEarnings",
      (SELECT COALESCE(SUM(rate), 0) FROM sessions WHERE mentor_id = ${mentorId} AND status = 'completed' AND ended_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}) AS "periodEarnings",
      (SELECT AVG(final_score) FROM reviews WHERE reviewee_id = ${mentorId} AND reviewer_role = 'mentee') AS "averageRating",
      (SELECT COUNT(*) FROM reviews WHERE reviewee_id = ${mentorId} AND reviewer_role = 'mentee') AS "totalReviews",
      (SELECT COUNT(*) FROM messages WHERE receiver_id = ${mentorId} AND is_read = false) AS "unreadMessages"
  `);

  return {
    completedSessions: Number(result.completedSessions ?? 0),
    upcomingSessions: Number(result.upcomingSessions ?? 0),
    totalEarnings: parseFloat(result.totalEarnings ?? '0'),
    periodEarnings: parseFloat(result.periodEarnings ?? '0'),
    averageRating: result.averageRating ? parseFloat(result.averageRating) : null,
    totalReviews: Number(result.totalReviews ?? 0),
    unreadMessages: Number(result.unreadMessages ?? 0),
  };
}

/**
 * This function from the previous developer is useful for a "Recent Activity" feed.
 */
export async function getMentorRecentSessions(mentorId: string, limit: number = 5) {
  return db
    .select({
      id: sessions.id,
      title: sessions.title,
      status: sessions.status,
      scheduledAt: sessions.scheduledAt,
      mentee: {
        id: users.id,
        name: users.name,
        image: users.image,
      },
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.menteeId, users.id))
    .where(eq(sessions.mentorId, mentorId))
    .orderBy(desc(sessions.scheduledAt))
    .limit(limit);
}

// ... (Keep all the existing Admin and Mentor query functions)

/**
 * Fetches a mentor's earnings grouped by month for a chart.
 * Follows the "no commission" rule as specified.
 */
export async function getMentorEarningsOverTime(mentorId: string, startDate: Date, endDate: Date) {
  const result = await db
    .select({
      // Extracts month in 'YYYY-MM' format for easy grouping and sorting
      month: sql<string>`to_char(${sessions.endedAt}, 'YYYY-MM')`.as('month'),
      // Calculates earnings for that month
      earnings: sum(sessions.rate).mapWith(Number),
    })
    .from(sessions)
    .where(and(
      eq(sessions.mentorId, mentorId),
      eq(sessions.status, 'completed'),
      gte(sessions.endedAt, startDate),
      lte(sessions.endedAt, endDate)
    ))
    .groupBy(sql`to_char(${sessions.endedAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${sessions.endedAt}, 'YYYY-MM')`);

  return result;
}

/**
 * Fetches the most recent reviews for a mentor.
 */
export async function getMentorRecentReviews(mentorId: string, limit: number = 5) {
  return db
    .select({
      reviewId: reviews.id,
      menteeName: users.name,
      rating: reviews.finalScore,
      feedback: reviews.feedback,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.reviewerId, users.id)) // Join to get the reviewer's (mentee's) name
    .where(and(
      eq(reviews.revieweeId, mentorId), // The mentor is the one being reviewed
      eq(reviews.reviewerRole, 'mentee') // The review is from a mentee
    ))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

/**
 * NOTE: The remaining functions related to `mentoringRelationships` are valuable
 * for a "My Mentees" management page but are not required for the main analytics dashboard.
 * They are kept here for future use.
 */