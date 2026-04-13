import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  MockAccessPolicyError,
  assertSharedMenteeFeatureAccess,
  assertSharedMentorFeatureAccess,
  enforceFeature,
  isSubscriptionPolicyError,
  getAdminDashboardKpis,
  getAdminMentorLeaderboard,
  getAdminSessionsOverTime,
  getMentorDashboardStats,
  getMentorEarningsOverTime,
  getMentorRecentReviews,
  getMentorRecentSessions,
  getTopMenteeQuestions,
  getTopUniversitiesSearched,
} = vi.hoisted(() => ({
  MockAccessPolicyError: class AccessPolicyError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly data?: unknown
    ) {
      super(message);
    }
  },
  assertSharedMenteeFeatureAccess: vi.fn(),
  assertSharedMentorFeatureAccess: vi.fn(),
  enforceFeature: vi.fn(),
  isSubscriptionPolicyError: vi.fn(() => false),
  getAdminDashboardKpis: vi.fn(),
  getAdminMentorLeaderboard: vi.fn(),
  getAdminSessionsOverTime: vi.fn(),
  getMentorDashboardStats: vi.fn(),
  getMentorEarningsOverTime: vi.fn(),
  getMentorRecentReviews: vi.fn(),
  getMentorRecentSessions: vi.fn(),
  getTopMenteeQuestions: vi.fn(),
  getTopUniversitiesSearched: vi.fn(),
}));

vi.mock('@/lib/access-policy/server', () => ({
  assertMenteeFeatureAccess: assertSharedMenteeFeatureAccess,
  assertMentorFeatureAccess: assertSharedMentorFeatureAccess,
  AccessPolicyError: MockAccessPolicyError,
}));

vi.mock('@/lib/subscriptions/policy-runtime', () => ({
  enforceFeature,
  isSubscriptionPolicyError,
}));

vi.mock('@/lib/db/queries/analytics.queries', () => ({
  getAdminDashboardKpis,
  getAdminMentorLeaderboard,
  getAdminSessionsOverTime,
  getMentorDashboardStats,
  getMentorEarningsOverTime,
  getMentorRecentReviews,
  getMentorRecentSessions,
  getTopMenteeQuestions,
  getTopUniversitiesSearched,
}));

vi.mock('@/lib/db', () => ({
  db: {},
}));

import {
  AnalyticsServiceError,
  getAdminAnalytics,
  getMenteeLearningAnalytics,
  getMentorAnalytics,
} from '@/lib/analytics/server/service';

describe('analytics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSharedMenteeFeatureAccess.mockResolvedValue(undefined);
    assertSharedMentorFeatureAccess.mockResolvedValue(undefined);
  });

  it('rejects mentor analytics for non-mentor users', async () => {
    assertSharedMentorFeatureAccess.mockRejectedValueOnce(
      new MockAccessPolicyError(403, 'Mentor access required')
    );

    await expect(
      getMentorAnalytics(
        'user-1',
        {},
        {
          id: 'user-1',
          roles: [{ name: 'mentee', displayName: 'Mentee' }],
        } as any
      )
    ).rejects.toMatchObject({
      status: 403,
      message: 'Mentor access required',
    });

    expect(enforceFeature).not.toHaveBeenCalled();
  });

  it('rejects mentee analytics for non-mentee users', async () => {
    assertSharedMenteeFeatureAccess.mockRejectedValueOnce(
      new MockAccessPolicyError(403, 'Mentee access required')
    );

    await expect(
      getMenteeLearningAnalytics(
        'user-1',
        {},
        {
          id: 'user-1',
          roles: [{ name: 'mentor', displayName: 'Mentor' }],
        } as any
      )
    ).rejects.toMatchObject({
      status: 403,
      message: 'Mentee access required',
    });

    expect(enforceFeature).not.toHaveBeenCalled();
  });

  it('rejects admin analytics for non-admin users', async () => {
    await expect(
      getAdminAnalytics(
        'user-1',
        {},
        {
          id: 'user-1',
          roles: [{ name: 'mentor', displayName: 'Mentor' }],
        } as any
      )
    ).rejects.toMatchObject({
      status: 403,
      message: 'Admin access required',
    });
  });

  it('converts mentor subscription policy denials into analytics service errors', async () => {
    const policyError = {
      status: 403,
      payload: {
        success: false,
        error: 'Analytics access not included in your plan',
      },
    };

    enforceFeature.mockRejectedValue(policyError);
    isSubscriptionPolicyError.mockReturnValue(true);

    await expect(
      getMentorAnalytics(
        'mentor-1',
        {},
        {
          id: 'mentor-1',
          roles: [{ name: 'mentor', displayName: 'Mentor' }],
        } as any
      )
    ).rejects.toMatchObject({
      status: 403,
      message: 'Analytics access not included in your plan',
      data: policyError.payload,
    });
  });
});
