import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getUserWithRoles,
  resolveAccessPolicyRuntimeConfig,
  resolveMentorAccessPolicy,
  getMentorFeatureDecisionFromPolicy,
  getMentorFeatureAccessFailure,
  resolveMenteeAccessPolicy,
  getMenteeFeatureDecisionFromPolicy,
  getMenteeFeatureAccessFailure,
  getMessagingAccessDecision,
  getMessagingAccessFailure,
  logAccessPolicyDenial,
} = vi.hoisted(() => ({
  getUserWithRoles: vi.fn(),
  resolveAccessPolicyRuntimeConfig: vi.fn(),
  resolveMentorAccessPolicy: vi.fn(),
  getMentorFeatureDecisionFromPolicy: vi.fn(),
  getMentorFeatureAccessFailure: vi.fn(),
  resolveMenteeAccessPolicy: vi.fn(),
  getMenteeFeatureDecisionFromPolicy: vi.fn(),
  getMenteeFeatureAccessFailure: vi.fn(),
  getMessagingAccessDecision: vi.fn(),
  getMessagingAccessFailure: vi.fn(),
  logAccessPolicyDenial: vi.fn(),
}));

vi.mock('@/lib/db/user-helpers', () => ({
  getUserWithRoles,
}));

vi.mock('@/lib/access-policy/runtime-config', () => ({
  resolveAccessPolicyRuntimeConfig,
}));

vi.mock('@/lib/mentor/server/access-policy', () => ({
  resolveMentorAccessPolicy,
  getMentorFeatureDecisionFromPolicy,
  getMentorFeatureAccessFailure,
}));

vi.mock('@/lib/mentee/server/access-policy', () => ({
  resolveMenteeAccessPolicy,
  getMenteeFeatureDecisionFromPolicy,
  getMenteeFeatureAccessFailure,
}));

vi.mock('@/lib/messaging/access-policy', () => ({
  getMessagingAccessDecision,
}));

vi.mock('@/lib/messaging/server/access-policy', () => ({
  getMessagingAccessFailure,
}));

vi.mock('@/lib/access-policy/telemetry', () => ({
  logAccessPolicyDenial,
}));

import {
  assertAccountAccess,
  AccessPolicyError,
  assertMentorFeatureAccess,
  assertMessagingAccess,
} from '@/lib/access-policy/server';
import { createAccessPolicyRequestCache } from '@/lib/access-policy/request-cache';

describe('access policy server helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAccessPolicyRuntimeConfig.mockResolvedValue({
      mentor: {},
      mentee: {},
      metadata: {
        source: 'baseline',
        version: null,
        schemaVersion: 1,
        configId: null,
        publishedAt: null,
        updatedAt: null,
      },
    });
  });

  it('reuses request-scoped current-user and mentor-policy lookups', async () => {
    const currentUser = {
      id: 'mentor-1',
      roles: [{ name: 'mentor' }],
      isActive: true,
      isBlocked: false,
    };
    const policy = {
      features: {
        'analytics.view': {
          key: 'analytics.view',
          label: 'Analytics',
          mode: 'full',
          allowed: true,
          reasonCode: 'ok',
        },
      },
    };
    const access = {
      key: 'analytics.view',
      label: 'Analytics',
      mode: 'full',
      allowed: true,
      reasonCode: 'ok',
    };

    getUserWithRoles.mockResolvedValue(currentUser);
    resolveMentorAccessPolicy.mockResolvedValue(policy);
    getMentorFeatureDecisionFromPolicy.mockReturnValue(access);

    const cache = createAccessPolicyRequestCache();

    await assertMentorFeatureAccess({
      userId: 'mentor-1',
      feature: 'analytics.view' as any,
      cache,
      source: 'test.one',
    });

    await assertMentorFeatureAccess({
      userId: 'mentor-1',
      feature: 'analytics.view' as any,
      cache,
      source: 'test.two',
    });

    expect(getUserWithRoles).toHaveBeenCalledTimes(1);
    expect(resolveMentorAccessPolicy).toHaveBeenCalledTimes(1);
    expect(getMentorFeatureDecisionFromPolicy).toHaveBeenCalledTimes(2);
  });

  it('logs structured messaging denials before raising an access-policy error', async () => {
    const currentUser = {
      id: 'mentor-2',
      roles: [{ name: 'mentor' }],
      isActive: true,
      isBlocked: false,
    };

    getUserWithRoles.mockResolvedValue(currentUser);
    resolveMentorAccessPolicy.mockResolvedValue({
      features: {},
    });
    getMessagingAccessDecision.mockReturnValue({
      allowed: false,
      audience: 'mentor',
    });
    getMessagingAccessFailure.mockReturnValue({
      status: 403,
      message: 'Direct messaging is not included in the current mentor plan.',
      reasonCode: 'feature_not_in_plan',
    });

    await expect(
      assertMessagingAccess({
        userId: 'mentor-2',
        intent: 'directMessages',
        audience: 'mentor',
        cache: createAccessPolicyRequestCache(),
        source: 'test.messaging',
      })
    ).rejects.toMatchObject({
      status: 403,
      message: 'Direct messaging is not included in the current mentor plan.',
      data: expect.objectContaining({
        reasonCode: 'feature_not_in_plan',
        audience: 'mentor',
        intent: 'directMessages',
        source: 'test.messaging',
      }),
    });

    expect(logAccessPolicyDenial).toHaveBeenCalledWith({
      scope: 'messaging',
      userId: 'mentor-2',
      status: 403,
      message: 'Direct messaging is not included in the current mentor plan.',
      reasonCode: 'feature_not_in_plan',
      intent: 'directMessages',
      audience: 'mentor',
      source: 'test.messaging',
    });
  });

  it('logs account denials before raising an access-policy error', async () => {
    getUserWithRoles.mockResolvedValue({
      id: 'user-3',
      roles: [{ name: 'mentee' }],
      isActive: false,
      isBlocked: false,
    });

    await expect(
      assertAccountAccess({
        userId: 'user-3',
        cache: createAccessPolicyRequestCache(),
        source: 'test.account',
      })
    ).rejects.toMatchObject({
      status: 403,
      message: 'This account is inactive',
      data: expect.objectContaining({
        reasonCode: 'account_inactive',
        source: 'test.account',
      }),
    });

    expect(logAccessPolicyDenial).toHaveBeenCalledWith({
      scope: 'account',
      userId: 'user-3',
      status: 403,
      message: 'This account is inactive',
      reasonCode: 'account_inactive',
      source: 'test.account',
    });
  });
});
