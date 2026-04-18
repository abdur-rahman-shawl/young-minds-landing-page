export interface AnalyticsDateRangeInput {
  startDate?: string | null;
  endDate?: string | null;
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function resolveAnalyticsDateRange(
  input: AnalyticsDateRangeInput | undefined,
  defaultWindowDays: number,
  now = new Date()
) {
  const endDate = input?.endDate ? new Date(input.endDate) : new Date(now);
  if (Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid endDate');
  }

  const startDate = input?.startDate
    ? new Date(input.startDate)
    : new Date(
        new Date(endDate).setDate(endDate.getDate() - (defaultWindowDays - 1))
      );

  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid startDate');
  }

  if (startDate.getTime() > endDate.getTime()) {
    throw new Error('startDate cannot be after endDate');
  }

  return { startDate, endDate };
}

function toUtcDateString(value: Date) {
  return value.toISOString().split('T')[0];
}

export function calculateLearningStreakFromDates(
  activeDateInputs: string[],
  referenceDate = new Date()
) {
  const activeDates = [...new Set(activeDateInputs)].sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (activeDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakStartDate: null as string | null,
      lastActiveDate: null as string | null,
    };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakStartDate: string | null = null;

  const today = new Date(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(referenceDate.getDate() - 1);

  for (let i = 0; i < activeDates.length; i += 1) {
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    const expectedDateString = toUtcDateString(expectedDate);
    const currentDateString = activeDates[i];

    if (
      currentDateString === expectedDateString ||
      (i === 0 && currentDateString === toUtcDateString(yesterday))
    ) {
      currentStreak += 1;
      streakStartDate = currentDateString;
    } else {
      break;
    }
  }

  tempStreak = 1;
  for (let i = 1; i < activeDates.length; i += 1) {
    const currentDate = new Date(activeDates[i]);
    const previousDate = new Date(activeDates[i - 1]);
    const dayDifference =
      (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDifference === 1) {
      tempStreak += 1;
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

export function buildLearningRecommendations(analytics: {
  currentStreak: number;
  weeklyProgress: number;
  consistencyScore: number;
  averageSessionDuration: number;
}) {
  const recommendations: string[] = [];

  if (analytics.currentStreak === 0) {
    recommendations.push(
      'Start your learning journey today! Even 10 minutes of learning counts.'
    );
  } else if (analytics.currentStreak < 3) {
    recommendations.push(
      `Great start! Keep going to build a stronger learning habit. Current streak: ${analytics.currentStreak} days.`
    );
  } else if (analytics.currentStreak >= 7) {
    recommendations.push(
      `Amazing! You're on a ${analytics.currentStreak}-day streak. You're building an excellent learning habit!`
    );
  }

  if (analytics.weeklyProgress < 25) {
    recommendations.push(
      "You're just getting started this week. Consider setting aside 30 minutes today to catch up on your goals."
    );
  } else if (analytics.weeklyProgress > 100) {
    recommendations.push(
      "Wow! You've exceeded your weekly goal. Consider challenging yourself with a slightly higher target next week."
    );
  }

  if (analytics.consistencyScore < 30) {
    recommendations.push(
      'Try to learn a little bit each day rather than long sessions occasionally. Consistency is key!'
    );
  } else if (analytics.consistencyScore > 70) {
    recommendations.push(
      "Your consistency is excellent! You're developing a strong learning routine."
    );
  }

  if (analytics.averageSessionDuration < 15) {
    recommendations.push(
      'Consider slightly longer learning sessions (20-30 minutes) for better retention and deeper understanding.'
    );
  } else if (analytics.averageSessionDuration > 120) {
    recommendations.push(
      'You have great focus! Consider taking breaks every hour to maintain optimal learning efficiency.'
    );
  }

  return recommendations.slice(0, 3);
}
