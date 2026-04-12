import { and, count, desc, eq, gte, sql, lte } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  learningAchievements,
  learnerProfiles,
  learningInsights,
  learningSessions,
  mentees,
  users,
  weeklyLearningGoals,
} from '@/lib/db/schema';
import {
  getAdminDashboardKpis,
  getAdminMentorLeaderboard,
  getAdminSessionsOverTime,
  getMentorDashboardStats,
  getMentorEarningsOverTime,
  getMentorRecentReviews,
  getMentorRecentSessions,
  getTopMenteeQuestions,
  getTopUniversitiesSearched,
} from '@/lib/db/queries/analytics.queries';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import {
  enforceFeature,
  isSubscriptionPolicyError,
} from '@/lib/subscriptions/policy-runtime';
import {
  analyticsDateRangeInputSchema,
  menteeLearningAnalyticsInputSchema,
  type AnalyticsDateRangeInput,
  type MenteeLearningAnalyticsInput,
} from './schemas';
import {
  buildLearningRecommendations,
  calculateLearningStreakFromDates,
  calculatePercentageChange,
  resolveAnalyticsDateRange,
} from './helpers';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export class AnalyticsServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

function assertAnalytics(
  condition: unknown,
  status: number,
  message: string,
  data?: unknown
): asserts condition {
  if (!condition) {
    throw new AnalyticsServiceError(status, message, data);
  }
}

async function getAnalyticsUser(
  userId: string,
  currentUser?: CurrentUser
): Promise<CurrentUser> {
  const resolvedUser = currentUser ?? (await getUserWithRoles(userId));
  assertAnalytics(resolvedUser, 401, 'Authentication required');
  return resolvedUser;
}

async function enforceAnalyticsFeature(
  action: 'analytics.mentor' | 'analytics.mentee',
  userId: string
) {
  try {
    await enforceFeature({
      action,
      userId,
    });
  } catch (error) {
    if (isSubscriptionPolicyError(error)) {
      throw new AnalyticsServiceError(
        error.status,
        error.payload.error,
        error.payload
      );
    }

    throw error;
  }
}

function parseAnalyticsDateRange(
  input: AnalyticsDateRangeInput,
  defaultWindowDays: number
) {
  try {
    return resolveAnalyticsDateRange(input, defaultWindowDays);
  } catch (error) {
    throw new AnalyticsServiceError(
      400,
      error instanceof Error ? error.message : 'Invalid analytics date range'
    );
  }
}

export async function getMentorAnalytics(
  userId: string,
  input?: AnalyticsDateRangeInput,
  currentUser?: CurrentUser
) {
  const parsed = analyticsDateRangeInputSchema.parse(input ?? {});
  const resolvedUser = await getAnalyticsUser(userId, currentUser);
  const isMentor = resolvedUser.roles.some((role) => role.name === 'mentor');

  assertAnalytics(isMentor, 403, 'Mentor access required');
  await enforceAnalyticsFeature('analytics.mentor', userId);

  const { startDate, endDate } = parseAnalyticsDateRange(parsed, 90);

  const [kpiData, earningsData, upcomingSessionsData, recentReviewsData] =
    await Promise.all([
      getMentorDashboardStats(userId, startDate, endDate),
      getMentorEarningsOverTime(userId, startDate, endDate),
      getMentorRecentSessions(userId, 5),
      getMentorRecentReviews(userId, 5),
    ]);

  return {
    kpis: {
      totalCompletedSessions: kpiData.completedSessions,
      totalEarnings: kpiData.totalEarnings,
      periodEarnings: kpiData.periodEarnings,
      averageRating: kpiData.averageRating,
      unreadMessages: kpiData.unreadMessages,
    },
    earningsOverTime: earningsData,
    upcomingSessions: upcomingSessionsData.map((session) => ({
      sessionId: session.id,
      menteeName: session.mentee?.name || 'Unknown Mentee',
      title: session.title,
      scheduledAt: session.scheduledAt,
    })),
    recentReviews: recentReviewsData.map((review) => ({
      reviewId: review.reviewId,
      menteeName: review.menteeName || 'Anonymous',
      rating: review.rating,
      feedback: review.feedback,
    })),
  };
}

export async function getAdminAnalytics(
  userId: string,
  input?: AnalyticsDateRangeInput,
  currentUser?: CurrentUser
) {
  const parsed = analyticsDateRangeInputSchema.parse(input ?? {});
  const resolvedUser = await getAnalyticsUser(userId, currentUser);
  const isAdmin = resolvedUser.roles.some((role) => role.name === 'admin');

  assertAnalytics(isAdmin, 403, 'Admin access required');

  const { startDate, endDate } = parseAnalyticsDateRange(parsed, 30);

  const [kpiData, sessionsData, mentorData, topQuestions, topUniversities] =
    await Promise.all([
      getAdminDashboardKpis(startDate, endDate),
      getAdminSessionsOverTime(startDate, endDate),
      getAdminMentorLeaderboard(5),
      getTopMenteeQuestions(startDate, endDate, 5),
      getTopUniversitiesSearched(startDate, endDate, 5),
    ]);

  return {
    kpis: {
      activeMentees: {
        current: kpiData.activeMentees.current,
        previous: kpiData.activeMentees.previous,
        change: calculatePercentageChange(
          kpiData.activeMentees.current,
          kpiData.activeMentees.previous
        ),
      },
      totalSessions: {
        current: kpiData.totalSessions.current,
        previous: kpiData.totalSessions.previous,
        change: calculatePercentageChange(
          kpiData.totalSessions.current,
          kpiData.totalSessions.previous
        ),
      },
      paidConversionRate: kpiData.paidConversionRate,
      averageSessionRating: kpiData.averageSessionRating,
    },
    sessionsOverTime: sessionsData,
    mentorLeaderboard: mentorData.map((mentor) => ({
      ...mentor,
      averageRating: mentor.averageRating
        ? Number(mentor.averageRating.toFixed(1))
        : 0,
    })),
    topMenteeQuestions: topQuestions,
    topUniversities,
    courseInsights: [
      {
        name: 'MS Computer Science',
        avgDuration: '2 yrs',
        avgFees: '$25k-$45k',
        interestPercentage: 38,
      },
    ],
    conversionFunnell: {
      visitors: 42000,
      signups: 5200,
      freeSessions: 1850,
      paidSessions: Math.round(
        (kpiData.paidConversionRate / 100) * kpiData.totalSessions.current
      ),
    },
  };
}

async function calculateConsistencyScore(menteeId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessionsForRange = await db
    .select({
      sessionDate: learningSessions.sessionDate,
    })
    .from(learningSessions)
    .where(
      and(
        eq(learningSessions.menteeId, menteeId),
        gte(learningSessions.sessionDate, startDate.toISOString().split('T')[0])
      )
    );

  if (sessionsForRange.length === 0) {
    return 0;
  }

  const activeDays = new Set(sessionsForRange.map((session) => session.sessionDate))
    .size;

  return Math.min((activeDays / days) * 100, 100);
}

export async function getMenteeLearningAnalytics(
  userId: string,
  input?: MenteeLearningAnalyticsInput,
  currentUser?: CurrentUser
) {
  const parsed = menteeLearningAnalyticsInputSchema.parse(input ?? {});
  const resolvedUser = await getAnalyticsUser(userId, currentUser);
  const isMentee = resolvedUser.roles.some((role) => role.name === 'mentee');

  assertAnalytics(isMentee, 403, 'Mentee access required');
  await enforceAnalyticsFeature('analytics.mentee', userId);

  const timeRangeDays = parsed.timeRange ?? 30;

  let userData = await db
    .select({ menteeId: mentees.id })
    .from(users)
    .leftJoin(mentees, eq(mentees.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  assertAnalytics(userData.length > 0, 404, 'User not found');

  let menteeId = userData[0].menteeId;

  if (!menteeId) {
    const newMentee = await db
      .insert(mentees)
      .values({
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: mentees.id });

    menteeId = newMentee[0].id;
  }

  let profile = await db
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.menteeId, menteeId))
    .limit(1);

  if (!profile.length) {
    await db.insert(learnerProfiles).values({
      menteeId,
      weeklyLearningGoalHours: '5.00',
      timezone: 'UTC',
      currentStreak: 0,
      longestStreak: 0,
      totalLearningHours: '0.00',
      totalSessionsCompleted: 0,
      averageSessionDurationMinutes: '0.00',
      consistencyScore: '0.00',
      learningVelocityScore: '0.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profile = await db
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.menteeId, menteeId))
      .limit(1);
  }

  const learnerProfile = profile[0];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const timeRangeStart = new Date(now);
  timeRangeStart.setDate(now.getDate() - timeRangeDays);

  let currentWeekGoal = await db
    .select()
    .from(weeklyLearningGoals)
    .where(
      and(
        eq(weeklyLearningGoals.menteeId, menteeId),
        eq(
          weeklyLearningGoals.weekStartDate,
          startOfWeek.toISOString().split('T')[0]
        )
      )
    )
    .limit(1);

  if (!currentWeekGoal.length) {
    await db.insert(weeklyLearningGoals).values({
      menteeId,
      weekStartDate: startOfWeek.toISOString().split('T')[0],
      weekEndDate: endOfWeek.toISOString().split('T')[0],
      goalHours: learnerProfile.weeklyLearningGoalHours || '5.00',
      actualHours: '0.00',
      goalStatus: 'NOT_STARTED',
      progressPercentage: '0.00',
      daysActive: 0,
      averageDailyMinutes: '0.00',
      goalSetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    currentWeekGoal = await db
      .select()
      .from(weeklyLearningGoals)
      .where(
        and(
          eq(weeklyLearningGoals.menteeId, menteeId),
          eq(
            weeklyLearningGoals.weekStartDate,
            startOfWeek.toISOString().split('T')[0]
          )
        )
      )
      .limit(1);
  }

  const streakSessions = await db
    .select({
      sessionDate: learningSessions.sessionDate,
    })
    .from(learningSessions)
    .where(
      and(
        eq(learningSessions.menteeId, menteeId),
        gte(learningSessions.totalMinutesSpent, 5)
      )
    )
    .orderBy(desc(learningSessions.sessionDate));

  const streakData = calculateLearningStreakFromDates(
    streakSessions.map((session) => session.sessionDate),
    now
  );

  const thisWeekSessions = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(${learningSessions.totalMinutesSpent}), 0)`,
      sessionCount: count(learningSessions.id),
      activeDays: sql<number>`COUNT(DISTINCT ${learningSessions.sessionDate})`,
    })
    .from(learningSessions)
    .where(
      and(
        eq(learningSessions.menteeId, menteeId),
        gte(
          learningSessions.sessionDate,
          startOfWeek.toISOString().split('T')[0]
        ),
        lte(learningSessions.sessionDate, endOfWeek.toISOString().split('T')[0])
      )
    );

  const weeklyActualMinutes = thisWeekSessions[0]?.totalMinutes || 0;
  const weeklyActualHours = weeklyActualMinutes / 60;
  const weeklyGoalHours = parseFloat(currentWeekGoal[0]?.goalHours || '5.00');
  const weeklyProgressPercentage = Math.min(
    (weeklyActualHours / weeklyGoalHours) * 100,
    100
  );

  if (currentWeekGoal.length) {
    await db
      .update(weeklyLearningGoals)
      .set({
        actualHours: weeklyActualHours.toFixed(2),
        progressPercentage: weeklyProgressPercentage.toFixed(2),
        daysActive: thisWeekSessions[0]?.activeDays || 0,
        averageDailyMinutes: thisWeekSessions[0]?.activeDays
          ? (
              weeklyActualMinutes / (thisWeekSessions[0].activeDays || 1)
            ).toFixed(2)
          : '0.00',
        goalStatus:
          weeklyProgressPercentage >= 100
            ? 'ACHIEVED'
            : weeklyProgressPercentage > 0
              ? 'IN_PROGRESS'
              : 'NOT_STARTED',
        updatedAt: new Date(),
      })
      .where(eq(weeklyLearningGoals.id, currentWeekGoal[0].id));
  }

  const velocityData = await db
    .select({
      avgMinutesPerDay: sql<number>`COALESCE(AVG(${learningSessions.totalMinutesSpent}), 0)`,
      avgSessionDuration: sql<number>`COALESCE(AVG(${learningSessions.totalMinutesSpent}), 0)`,
      totalSessions: count(learningSessions.id),
    })
    .from(learningSessions)
    .where(
      and(
        eq(learningSessions.menteeId, menteeId),
        gte(
          learningSessions.sessionDate,
          timeRangeStart.toISOString().split('T')[0]
        )
      )
    );

  const dayOfWeekData = await db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${learningSessions.sessionDate})`,
      sessionCount: count(learningSessions.id),
    })
    .from(learningSessions)
    .where(
      and(
        eq(learningSessions.menteeId, menteeId),
        gte(
          learningSessions.sessionDate,
          timeRangeStart.toISOString().split('T')[0]
        )
      )
    )
    .groupBy(sql`EXTRACT(DOW FROM ${learningSessions.sessionDate})`);

  const velocity = velocityData[0];
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  let mostActiveDay = 'Monday';

  if (dayOfWeekData.length > 0) {
    const maxDayData = dayOfWeekData.reduce((max, current) =>
      current.sessionCount > max.sessionCount ? current : max
    );
    mostActiveDay = dayNames[maxDayData.dayOfWeek] || 'Monday';
  }

  const achievements = await db
    .select()
    .from(learningAchievements)
    .where(eq(learningAchievements.menteeId, menteeId))
    .orderBy(desc(learningAchievements.earnedAt));

  const insights = await db
    .select()
    .from(learningInsights)
    .where(
      and(
        eq(learningInsights.menteeId, menteeId),
        eq(learningInsights.isActive, true),
        eq(learningInsights.isDismissed, false)
      )
    )
    .orderBy(desc(learningInsights.priority), desc(learningInsights.createdAt))
    .limit(5);

  const consistencyScore = await calculateConsistencyScore(menteeId, timeRangeDays);

  await db
    .update(learnerProfiles)
    .set({
      currentStreak: streakData.currentStreak,
      longestStreak: Math.max(
        streakData.longestStreak,
        learnerProfile.longestStreak
      ),
      lastActiveDate: streakData.lastActiveDate,
      mostActiveDay,
      averageSessionDurationMinutes: (
        Number(velocity?.avgSessionDuration) || 0
      ).toFixed(2),
      consistencyScore: consistencyScore.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(learnerProfiles.id, learnerProfile.id));

  const recommendations = buildLearningRecommendations({
    currentStreak: streakData.currentStreak,
    weeklyProgress: weeklyProgressPercentage,
    consistencyScore,
    averageSessionDuration: Number(velocity?.avgSessionDuration) || 0,
  });

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: Math.max(
      streakData.longestStreak,
      learnerProfile.longestStreak
    ),
    streakStartDate: streakData.streakStartDate,
    lastActiveDate: streakData.lastActiveDate,
    weeklyGoal: {
      goalHours: weeklyGoalHours,
      actualHours: weeklyActualHours,
      percentage: weeklyProgressPercentage,
      daysRemaining: Math.max(
        0,
        7 -
          Math.floor(
            (now.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24)
          )
      ),
      onTrack:
        weeklyProgressPercentage >=
        ((now.getTime() - startOfWeek.getTime()) /
          (endOfWeek.getTime() - startOfWeek.getTime())) *
          100,
      status: currentWeekGoal[0]?.goalStatus || 'NOT_STARTED',
      daysActive: thisWeekSessions[0]?.activeDays || 0,
    },
    learningVelocity: {
      avgMinutesPerDay: Math.round(Number(velocity?.avgMinutesPerDay) || 0),
      avgSessionDuration: Math.round(Number(velocity?.avgSessionDuration) || 0),
      totalSessions: velocity?.totalSessions || 0,
      mostActiveDay,
      consistencyScore: Number(consistencyScore.toFixed(1)),
    },
    achievements: achievements.map((achievement) => ({
      id: achievement.id,
      type: achievement.achievementType,
      title: achievement.title,
      description: achievement.description,
      iconUrl: achievement.iconUrl,
      badgeColor: achievement.badgeColor,
      isCompleted: achievement.isCompleted,
      earnedAt: achievement.earnedAt,
      points: achievement.points,
      rarity: achievement.rarity,
      category: achievement.category,
    })),
    recommendations,
    insights: insights.map((insight) => ({
      id: insight.id,
      type: insight.insightType,
      title: insight.title,
      message: insight.message,
      actionText: insight.actionText,
      actionUrl: insight.actionUrl,
      priority: insight.priority,
      category: insight.category,
    })),
    settings: {
      weeklyGoalHours: parseFloat(
        learnerProfile.weeklyLearningGoalHours || '5.00'
      ),
      preferredLearningDays:
        learnerProfile.preferredLearningDays || [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
        ],
      timezone: learnerProfile.timezone || 'UTC',
      learningReminders: learnerProfile.learningReminders,
    },
  };
}
