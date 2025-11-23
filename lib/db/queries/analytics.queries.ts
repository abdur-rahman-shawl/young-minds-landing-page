import { db } from '@/lib/db';
import { sessions, users, userRoles, roles, reviews, messages } from '@/lib/db/schema';
import { and, eq, gte, lte, desc, sql, count, avg, sum, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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

const buildActiveMenteesCountSQL = (startDate: Date, endDate: Date) => sql`
  SELECT COUNT(*) FROM (
    -- Registered or recently logged-in mentees
    SELECT DISTINCT u.id
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id
    INNER JOIN roles r ON r.id = ur.role_id AND r.name = 'mentee'
    WHERE u.is_blocked = false
      AND (
        (u.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()})
        OR (u.updated_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()})
      )

    UNION

    -- Mentees who chatted with the AI assistant
    SELECT DISTINCT chat_user.id
    FROM ai_chatbot_messages m
    INNER JOIN users chat_user ON chat_user.id = m.user_id
    INNER JOIN user_roles chat_ur ON chat_ur.user_id = chat_user.id
    INNER JOIN roles chat_roles ON chat_roles.id = chat_ur.role_id AND chat_roles.name = 'mentee'
    WHERE m.sender_type = 'user'
      AND m.user_id IS NOT NULL
      AND chat_user.is_blocked = false
      AND m.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}

    UNION

    -- Mentees who scheduled or completed sessions
    SELECT DISTINCT mentee_user.id
    FROM sessions s
    INNER JOIN users mentee_user ON mentee_user.id = s.mentee_id
    INNER JOIN user_roles mentee_ur ON mentee_ur.user_id = mentee_user.id
    INNER JOIN roles mentee_roles ON mentee_roles.id = mentee_ur.role_id AND mentee_roles.name = 'mentee'
    INNER JOIN users mentor_user ON mentor_user.id = s.mentor_id
    WHERE s.status IN ('scheduled', 'in_progress', 'completed')
      AND mentee_user.is_blocked = false
      AND mentor_user.is_blocked = false
      AND s.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
  ) AS active_mentees_window
`;

const buildMentorExposureStats = (startDate: Date, endDate: Date) => {
  const exposuresSubquery = sql`
    SELECT DISTINCT m.user_id
    FROM ai_chatbot_messages m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.user_id IS NOT NULL
      AND u.is_blocked = false
      AND COALESCE(m.metadata->>'eventType', '') = 'mentors_shown'
      AND m.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
  `;

  const exposuresCount = sql`
    SELECT COUNT(*) FROM (${exposuresSubquery}) mentor_exposures
  `;

  const conversionsCount = sql`
    SELECT COUNT(DISTINCT s.mentee_id)
    FROM sessions s
    INNER JOIN (${exposuresSubquery}) mentor_exposures ON mentor_exposures.user_id = s.mentee_id
    INNER JOIN users mentor ON mentor.id = s.mentor_id AND mentor.is_blocked = false
    WHERE s.status IN ('scheduled', 'in_progress', 'completed')
      AND s.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
  `;

  return { exposuresCount, conversionsCount };
};

export async function getAdminDashboardKpis(startDate: Date, endDate: Date) {
  const { prevStartDate, prevEndDate } = getPreviousDateRange(startDate, endDate);
  const currentActiveMenteesSql = buildActiveMenteesCountSQL(startDate, endDate);
  const previousActiveMenteesSql = buildActiveMenteesCountSQL(prevStartDate, prevEndDate);
  const { exposuresCount: mentorExposureCountSql, conversionsCount: mentorConversionCountSql } =
    buildMentorExposureStats(startDate, endDate);

  // The fix is to add .toISOString() to every date variable in the query.
  const [kpiResult] = await db.execute(sql`
    SELECT
      (${currentActiveMenteesSql}) AS "currentActiveMentees",
      (${previousActiveMenteesSql}) AS "previousActiveMentees",
      (SELECT COUNT(s.id)
        FROM sessions s
        JOIN users mentee ON mentee.id = s.mentee_id AND mentee.is_blocked = false
        JOIN users mentor ON mentor.id = s.mentor_id AND mentor.is_blocked = false
        WHERE s.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
      ) AS "currentSessions",
      (SELECT COUNT(s.id)
        FROM sessions s
        JOIN users mentee ON mentee.id = s.mentee_id AND mentee.is_blocked = false
        JOIN users mentor ON mentor.id = s.mentor_id AND mentor.is_blocked = false
        WHERE s.created_at BETWEEN ${prevStartDate.toISOString()} AND ${prevEndDate.toISOString()}
      ) AS "previousSessions",
      (SELECT AVG(r.final_score)
        FROM reviews r
        JOIN sessions s ON r.session_id = s.id
        JOIN users mentee ON mentee.id = s.mentee_id AND mentee.is_blocked = false
        JOIN users mentor ON mentor.id = s.mentor_id AND mentor.is_blocked = false
        WHERE r.reviewer_role = 'mentee' AND s.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
      ) AS "averageRating",
      (${mentorExposureCountSql}) AS "mentorExposureCount",
      (${mentorConversionCountSql}) AS "mentorConversionCount"
  `);

  const currentSessions = Number(kpiResult.currentSessions ?? 0);
  const mentorExposureCount = Number(kpiResult.mentorExposureCount ?? 0);
  const mentorConversionCount = Number(kpiResult.mentorConversionCount ?? 0);
  const mentorConversionRate =
    mentorExposureCount > 0 ? (mentorConversionCount / mentorExposureCount) * 100 : 0;

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
    paidConversionRate: parseFloat(mentorConversionRate.toFixed(1)),
  };
}

export async function getAdminSessionsOverTime(startDate: Date, endDate: Date) {
  const mentorUser = alias(users, 'sessions_mentor');
  const menteeUser = alias(users, 'sessions_mentee');

  const result = await db
    .select({
      date: sql<string>`DATE(${sessions.createdAt})`.as('date'),
      sessions: count(sessions.id),
    })
    .from(sessions)
    .innerJoin(mentorUser, eq(sessions.mentorId, mentorUser.id))
    .innerJoin(menteeUser, eq(sessions.menteeId, menteeUser.id))
    .where(and(
      gte(sessions.createdAt, startDate),
      lte(sessions.createdAt, endDate),
      eq(mentorUser.isBlocked, false),
      eq(menteeUser.isBlocked, false),
    ))
    .groupBy(sql`DATE(${sessions.createdAt})`)
    .orderBy(sql`DATE(${sessions.createdAt})`);

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
        .where(eq(users.isBlocked, false))
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

export async function getTopUniversitiesSearched(startDate: Date, endDate: Date, limit: number = 5) {
  const rows = await db.execute(sql`
    SELECT
      university,
      COUNT(*) AS mentions
    FROM (
      SELECT unnest(universities) AS university, created_at
      FROM ai_chatbot_message_insights
      WHERE universities IS NOT NULL
    ) sub
    WHERE sub.created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    GROUP BY university
    ORDER BY mentions DESC
    LIMIT ${limit}
  `);

  return rows.map((row: any) => ({
    name: row.university as string,
    mentions: Number(row.mentions ?? 0),
  }));
}

export async function getTopMenteeQuestions(startDate: Date, endDate: Date, limit: number = 5) {
  const rows = await db.execute(sql`
    SELECT
      question_text AS query,
      COUNT(*) AS mentions
    FROM ai_chatbot_message_insights
    WHERE is_question = true
      AND question_text IS NOT NULL
      AND created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    GROUP BY question_hash, question_text
    ORDER BY mentions DESC
    LIMIT ${limit}
  `);

  return rows.map((row: any) => ({
    query: row.query as string,
    mentions: Number(row.mentions ?? 0),
  }));
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
