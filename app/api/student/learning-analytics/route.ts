import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { 
  learnerProfiles,
  learningSessions,
  weeklyLearningGoals,
  learningAchievements,
  learningInsights,
  mentees,
  users,
  courseEnrollments
} from '@/lib/db/schema';
import { eq, and, desc, asc, gte, lte, sql, count, avg, sum } from 'drizzle-orm';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';

// GET /api/student/learning-analytics - Get comprehensive learning analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // days
    
    // Get user from auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const access = await checkFeatureAccess(userId, FEATURE_KEYS.ANALYTICS_ACCESS_LEVEL);
    if (!access.has_access) {
      return NextResponse.json(
        {
          success: false,
          error: access.reason || 'Analytics access not included in your plan',
          upgrade_required: true,
        },
        { status: 403 }
      );
    }

    // Get or create mentee and learner profile
    let userData = await db
      .select({ menteeId: mentees.id })
      .from(users)
      .leftJoin(mentees, eq(mentees.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData.length) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    let menteeId = userData[0].menteeId;

    // Auto-create mentee if doesn't exist
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

    // Get or create learner profile
    let profile = await db
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.menteeId, menteeId))
      .limit(1);

    if (!profile.length) {
      // Create default learner profile
      await db
        .insert(learnerProfiles)
        .values({
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

      // Fetch the created profile
      profile = await db
        .select()
        .from(learnerProfiles)
        .where(eq(learnerProfiles.menteeId, menteeId))
        .limit(1);
    }

    const learnerProfile = profile[0];

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const timeRangeDays = parseInt(timeRange);
    const timeRangeStart = new Date(now);
    timeRangeStart.setDate(now.getDate() - timeRangeDays);

    // Get current week's goal
    let currentWeekGoal = await db
      .select()
      .from(weeklyLearningGoals)
      .where(and(
        eq(weeklyLearningGoals.menteeId, menteeId),
        eq(weeklyLearningGoals.weekStartDate, startOfWeek.toISOString().split('T')[0])
      ))
      .limit(1);

    // Create current week goal if doesn't exist
    if (!currentWeekGoal.length) {
      await db
        .insert(weeklyLearningGoals)
        .values({
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

      // Fetch the created goal
      currentWeekGoal = await db
        .select()
        .from(weeklyLearningGoals)
        .where(and(
          eq(weeklyLearningGoals.menteeId, menteeId),
          eq(weeklyLearningGoals.weekStartDate, startOfWeek.toISOString().split('T')[0])
        ))
        .limit(1);
    }

    // Calculate real learning streak
    const streakData = await calculateLearningStreak(menteeId);
    
    // Get this week's actual learning time
    const thisWeekSessions = await db
      .select({
        totalMinutes: sql<number>`COALESCE(SUM(${learningSessions.totalMinutesSpent}), 0)`,
        sessionCount: count(learningSessions.id),
        activeDays: sql<number>`COUNT(DISTINCT ${learningSessions.sessionDate})`,
      })
      .from(learningSessions)
      .where(and(
        eq(learningSessions.menteeId, menteeId),
        gte(learningSessions.sessionDate, startOfWeek.toISOString().split('T')[0]),
        lte(learningSessions.sessionDate, endOfWeek.toISOString().split('T')[0])
      ));

    const weeklyActualMinutes = thisWeekSessions[0]?.totalMinutes || 0;
    const weeklyActualHours = weeklyActualMinutes / 60;
    const weeklyGoalHours = parseFloat(currentWeekGoal[0]?.goalHours || '5.00');
    const weeklyProgressPercentage = Math.min((weeklyActualHours / weeklyGoalHours) * 100, 100);

    // Update weekly goal with actual progress
    if (currentWeekGoal.length) {
      await db
        .update(weeklyLearningGoals)
        .set({
          actualHours: weeklyActualHours.toFixed(2),
          progressPercentage: weeklyProgressPercentage.toFixed(2),
          daysActive: thisWeekSessions[0]?.activeDays || 0,
          averageDailyMinutes: thisWeekSessions[0]?.activeDays 
            ? (weeklyActualMinutes / (thisWeekSessions[0].activeDays || 1)).toFixed(2)
            : '0.00',
          goalStatus: weeklyProgressPercentage >= 100 ? 'ACHIEVED' : 
                     weeklyProgressPercentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          updatedAt: new Date(),
        })
        .where(eq(weeklyLearningGoals.id, currentWeekGoal[0].id));
    }

    // Get learning velocity data
    const velocityData = await db
      .select({
        avgMinutesPerDay: sql<number>`COALESCE(AVG(${learningSessions.totalMinutesSpent}), 0)`,
        avgSessionDuration: sql<number>`COALESCE(AVG(${learningSessions.totalMinutesSpent}), 0)`,
        totalSessions: count(learningSessions.id),
      })
      .from(learningSessions)
      .where(and(
        eq(learningSessions.menteeId, menteeId),
        gte(learningSessions.sessionDate, timeRangeStart.toISOString().split('T')[0])
      ));

    // Get day of week statistics separately to avoid nested aggregates
    const dayOfWeekData = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${learningSessions.sessionDate})`,
        sessionCount: count(learningSessions.id),
      })
      .from(learningSessions)
      .where(and(
        eq(learningSessions.menteeId, menteeId),
        gte(learningSessions.sessionDate, timeRangeStart.toISOString().split('T')[0])
      ))
      .groupBy(sql`EXTRACT(DOW FROM ${learningSessions.sessionDate})`);

    const velocity = velocityData[0];
    
    // Determine most active day from separate query
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let mostActiveDay = 'Monday'; // default
    if (dayOfWeekData.length > 0) {
      // Find the day with the most sessions
      const maxDayData = dayOfWeekData.reduce((max, current) => 
        (current.sessionCount > max.sessionCount) ? current : max
      );
      mostActiveDay = dayNames[maxDayData.dayOfWeek] || 'Monday';
    }

    // Get achievements
    const achievements = await db
      .select()
      .from(learningAchievements)
      .where(eq(learningAchievements.menteeId, menteeId))
      .orderBy(desc(learningAchievements.earnedAt));

    // Get active insights
    const insights = await db
      .select()
      .from(learningInsights)
      .where(and(
        eq(learningInsights.menteeId, menteeId),
        eq(learningInsights.isActive, true),
        eq(learningInsights.isDismissed, false)
      ))
      .orderBy(desc(learningInsights.priority), desc(learningInsights.createdAt))
      .limit(5);

    // Calculate consistency score based on recent activity
    const consistencyScore = await calculateConsistencyScore(menteeId, timeRangeDays);

    // Update learner profile with latest data
    await db
      .update(learnerProfiles)
      .set({
        currentStreak: streakData.currentStreak,
        longestStreak: Math.max(streakData.longestStreak, learnerProfile.longestStreak),
        lastActiveDate: streakData.lastActiveDate,
        mostActiveDay,
        averageSessionDurationMinutes: (Number(velocity?.avgSessionDuration) || 0).toFixed(2),
        consistencyScore: consistencyScore.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(learnerProfiles.id, learnerProfile.id));

    // Generate smart recommendations
    const recommendations = await generateRecommendations(menteeId, {
      currentStreak: streakData.currentStreak,
      weeklyProgress: weeklyProgressPercentage,
      consistencyScore,
      averageSessionDuration: Number(velocity?.avgSessionDuration) || 0,
    });

    // Return comprehensive analytics
    return NextResponse.json({
      success: true,
      data: {
        // Current streak data
        currentStreak: streakData.currentStreak,
        longestStreak: Math.max(streakData.longestStreak, learnerProfile.longestStreak),
        streakStartDate: streakData.streakStartDate,
        lastActiveDate: streakData.lastActiveDate,
        
        // Weekly goal data
        weeklyGoal: {
          goalHours: weeklyGoalHours,
          actualHours: weeklyActualHours,
          percentage: weeklyProgressPercentage,
          daysRemaining: Math.max(0, 7 - Math.floor((now.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24))),
          onTrack: weeklyProgressPercentage >= (((now.getTime() - startOfWeek.getTime()) / (endOfWeek.getTime() - startOfWeek.getTime())) * 100),
          status: currentWeekGoal[0]?.goalStatus || 'NOT_STARTED',
          daysActive: thisWeekSessions[0]?.activeDays || 0,
        },
        
        // Learning velocity
        learningVelocity: {
          avgMinutesPerDay: Math.round(Number(velocity?.avgMinutesPerDay) || 0),
          avgSessionDuration: Math.round(Number(velocity?.avgSessionDuration) || 0),
          totalSessions: velocity?.totalSessions || 0,
          mostActiveDay,
          consistencyScore: parseFloat(consistencyScore.toFixed(1)),
        },
        
        // Achievements
        achievements: achievements.map(achievement => ({
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
        
        // Smart recommendations
        recommendations,
        
        // Active insights
        insights: insights.map(insight => ({
          id: insight.id,
          type: insight.insightType,
          title: insight.title,
          message: insight.message,
          actionText: insight.actionText,
          actionUrl: insight.actionUrl,
          priority: insight.priority,
          category: insight.category,
        })),
        
        // Profile settings
        settings: {
          weeklyGoalHours: parseFloat(learnerProfile.weeklyLearningGoalHours || '5.00'),
          preferredLearningDays: learnerProfile.preferredLearningDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timezone: learnerProfile.timezone || 'UTC',
          learningReminders: learnerProfile.learningReminders,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching learning analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch learning analytics' },
      { status: 500 }
    );
  }
}

// Helper function to calculate learning streak
async function calculateLearningStreak(menteeId: string) {
  const sessions = await db
    .select({
      sessionDate: learningSessions.sessionDate,
      totalMinutes: learningSessions.totalMinutesSpent,
    })
    .from(learningSessions)
    .where(and(
      eq(learningSessions.menteeId, menteeId),
      gte(learningSessions.totalMinutesSpent, 5) // Minimum 5 minutes to count as active
    ))
    .orderBy(desc(learningSessions.sessionDate));

  if (sessions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakStartDate: null,
      lastActiveDate: null,
    };
  }

  // Group sessions by date and get unique active dates
  const activeDates = [...new Set(sessions.map(s => s.sessionDate))].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakStartDate = null;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Calculate current streak
  for (let i = 0; i < activeDates.length; i++) {
    const currentDate = activeDates[i];
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];

    if (currentDate === expectedDateStr || (i === 0 && currentDate === yesterday)) {
      currentStreak++;
      if (i === currentStreak - 1) {
        streakStartDate = currentDate;
      }
    } else {
      break;
    }
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < activeDates.length; i++) {
    const currentDate = new Date(activeDates[i]);
    const previousDate = new Date(activeDates[i - 1]);
    const dayDifference = (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDifference === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    streakStartDate,
    lastActiveDate: activeDates[0] || null,
  };
}

// Helper function to calculate consistency score
async function calculateConsistencyScore(menteeId: string, days: number): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await db
    .select({
      sessionDate: learningSessions.sessionDate,
      totalMinutes: learningSessions.totalMinutesSpent,
    })
    .from(learningSessions)
    .where(and(
      eq(learningSessions.menteeId, menteeId),
      gte(learningSessions.sessionDate, startDate.toISOString().split('T')[0])
    ));

  if (sessions.length === 0) return 0;

  // Get unique active days
  const activeDays = new Set(sessions.map(s => s.sessionDate)).size;
  const consistencyScore = (activeDays / days) * 100;

  return Math.min(consistencyScore, 100);
}

// Helper function to generate smart recommendations
async function generateRecommendations(menteeId: string, analytics: {
  currentStreak: number;
  weeklyProgress: number;
  consistencyScore: number;
  averageSessionDuration: number;
}) {
  const recommendations: string[] = [];

  // Streak-based recommendations
  if (analytics.currentStreak === 0) {
    recommendations.push("Start your learning journey today! Even 10 minutes of learning counts.");
  } else if (analytics.currentStreak < 3) {
    recommendations.push(`Great start! Keep going to build a stronger learning habit. Current streak: ${analytics.currentStreak} days.`);
  } else if (analytics.currentStreak >= 7) {
    recommendations.push(`Amazing! You're on a ${analytics.currentStreak}-day streak. You're building an excellent learning habit!`);
  }

  // Weekly goal recommendations
  if (analytics.weeklyProgress < 25) {
    recommendations.push("You're just getting started this week. Consider setting aside 30 minutes today to catch up on your goals.");
  } else if (analytics.weeklyProgress > 100) {
    recommendations.push("Wow! You've exceeded your weekly goal. Consider challenging yourself with a slightly higher target next week.");
  }

  // Consistency recommendations
  if (analytics.consistencyScore < 30) {
    recommendations.push("Try to learn a little bit each day rather than long sessions occasionally. Consistency is key!");
  } else if (analytics.consistencyScore > 70) {
    recommendations.push("Your consistency is excellent! You're developing a strong learning routine.");
  }

  // Session duration recommendations
  if (analytics.averageSessionDuration < 15) {
    recommendations.push("Consider slightly longer learning sessions (20-30 minutes) for better retention and deeper understanding.");
  } else if (analytics.averageSessionDuration > 120) {
    recommendations.push("You have great focus! Consider taking breaks every hour to maintain optimal learning efficiency.");
  }

  return recommendations.slice(0, 3); // Return top 3 recommendations
}
