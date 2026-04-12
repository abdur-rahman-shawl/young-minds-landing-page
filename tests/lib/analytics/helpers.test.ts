import { describe, expect, it } from 'vitest';

import {
  buildLearningRecommendations,
  calculateLearningStreakFromDates,
  calculatePercentageChange,
  resolveAnalyticsDateRange,
} from '@/lib/analytics/server/helpers';

describe('analytics helpers', () => {
  it('calculates percentage change with a zero previous value', () => {
    expect(calculatePercentageChange(5, 0)).toBe(100);
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });

  it('resolves the default analytics date range window', () => {
    const now = new Date('2026-04-03T12:00:00.000Z');
    const range = resolveAnalyticsDateRange(undefined, 30, now);

    expect(range.endDate.toISOString()).toBe('2026-04-03T12:00:00.000Z');
    expect(range.startDate.toISOString()).toBe('2026-03-05T12:00:00.000Z');
  });

  it('rejects inverted analytics date ranges', () => {
    expect(() =>
      resolveAnalyticsDateRange({
        startDate: '2026-04-05T00:00:00.000Z',
        endDate: '2026-04-03T00:00:00.000Z',
      }, 30)
    ).toThrow('startDate cannot be after endDate');
  });

  it('calculates current and longest learning streaks from active dates', () => {
    const result = calculateLearningStreakFromDates(
      ['2026-04-03', '2026-04-02', '2026-03-31', '2026-03-30', '2026-03-29'],
      new Date('2026-04-03T12:00:00.000Z')
    );

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(3);
    expect(result.lastActiveDate).toBe('2026-04-03');
  });

  it('builds recommendations from the learner analytics state', () => {
    const recommendations = buildLearningRecommendations({
      currentStreak: 0,
      weeklyProgress: 10,
      consistencyScore: 20,
      averageSessionDuration: 10,
    });

    expect(recommendations).toHaveLength(3);
    expect(recommendations[0]).toContain('Start your learning journey');
  });
});
