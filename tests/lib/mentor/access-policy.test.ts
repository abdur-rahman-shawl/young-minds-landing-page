import { describe, expect, it } from 'vitest';

import { buildAccountAccessPolicySnapshot } from '@/lib/access-policy/account';
import {
  buildMentorAccessPolicySnapshot,
  evaluateMentorFeatureAccess,
  getMentorAccessReasonCode,
  getMentorDashboardSectionFeature,
  getMentorFeatureDecision,
  isMentorFeatureEnabled,
  MENTOR_FEATURE_KEYS,
  mergeMentorPolicyConfig,
  normalizeMentorPaymentStatus,
  normalizeMentorVerificationStatus,
} from '@/lib/mentor/access-policy';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import type { SubscriptionEntitlementSnapshot } from '@/lib/subscriptions/entitlement-snapshot';
import type { SubscriptionPlanFeature } from '@/lib/subscriptions/enforcement';

function createPlanFeature(featureKey: string): SubscriptionPlanFeature {
  return {
    feature_key: featureKey,
    feature_name: featureKey,
    is_included: true,
    value_type: 'boolean',
    unit: null,
    limit_count: null,
    limit_minutes: null,
    limit_text: null,
    limit_amount: null,
    limit_percent: null,
    limit_json: null,
    limit_interval: null,
    limit_interval_count: 1,
    is_metered: false,
  };
}

function createSubscriptionSnapshot(
  state: SubscriptionEntitlementSnapshot['state'],
  featureKeys: string[] = []
): SubscriptionEntitlementSnapshot {
  const features = featureKeys.map(createPlanFeature);

  return {
    audience: 'mentor',
    state,
    hasSubscription: state === 'loaded',
    features,
    featureRecords: features.map((feature) => ({
      feature_key: feature.feature_key,
      is_included: feature.is_included,
      limit_amount: feature.limit_amount,
    })),
    errorMessage: state === 'missing' ? 'No active mentor subscription' : null,
  };
}

const activeAccount = buildAccountAccessPolicySnapshot({
  isAuthenticated: true,
  isActive: true,
  isBlocked: false,
});

describe('mentor access policy', () => {
  it('normalizes unknown verification and payment states safely', () => {
    expect(normalizeMentorVerificationStatus('SOMETHING_ELSE')).toBe('UNKNOWN');
    expect(normalizeMentorVerificationStatus(null)).toBe('YET_TO_APPLY');
    expect(normalizeMentorPaymentStatus('SETTLED')).toBe('UNKNOWN');
  });

  it('allows eligible mentor features for a verified and fully activated mentor', () => {
    const policy = buildMentorAccessPolicySnapshot({
      isMentor: true,
      accountAccess: activeAccount,
      mentorProfile: {
        verificationStatus: 'VERIFIED',
        paymentStatus: 'COMPLETED',
      },
      subscription: createSubscriptionSnapshot('loaded', [
        FEATURE_KEYS.ANALYTICS_ACCESS_LEVEL,
        FEATURE_KEYS.CONTENT_POSTING_ACCESS,
        FEATURE_KEYS.SESSION_RECORDINGS_ACCESS,
        FEATURE_KEYS.DIRECT_MESSAGES_DAILY,
        FEATURE_KEYS.MESSAGE_REQUESTS_DAILY,
      ]),
    });

    expect(policy.isVerified).toBe(true);
    expect(policy.hasRestrictedFeatures).toBe(false);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.dashboardStats)
    ).toBe(true);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.availabilityManage)
    ).toBe(true);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.analyticsView)
    ).toBe(true);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.recordingsView)
    ).toBe(true);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.directMessages)
    ).toBe(true);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.messageRequests)
    ).toBe(true);
  });

  it('blocks activation-required features while leaving safe features available during review', () => {
    const policy = buildMentorAccessPolicySnapshot({
      isMentor: true,
      accountAccess: activeAccount,
      mentorProfile: {
        verificationStatus: 'IN_PROGRESS',
        paymentStatus: 'PENDING',
      },
    });

    const dashboardStats = getMentorFeatureDecision(
      policy,
      MENTOR_FEATURE_KEYS.dashboardStats
    );
    const messages = getMentorFeatureDecision(
      policy,
      MENTOR_FEATURE_KEYS.messagesView
    );

    expect(policy.hasRestrictedFeatures).toBe(true);
    expect(dashboardStats?.allowed).toBe(false);
    expect(dashboardStats?.reasonCode).toBe('verification_pending');
    expect(messages?.allowed).toBe(true);
  });

  it('blocks payment-gated mentor operations until activation is complete', () => {
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'PENDING',
        },
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('payment_required');
  });

  it('marks not-yet-applied mentors as requiring application completion', () => {
    const availability = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.availabilityManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: null,
      }
    );

    expect(availability.allowed).toBe(false);
    expect(availability.reasonCode).toBe('application_required');
    expect(getMentorAccessReasonCode('YET_TO_APPLY')).toBe(
      'application_required'
    );
  });

  it('uses action-required for reverification states', () => {
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'REVERIFICATION',
          paymentStatus: 'COMPLETED',
        },
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('action_required');
  });

  it('blocks subscription-backed mentor features when the plan is missing', () => {
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('missing'),
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('subscription_required');
  });

  it('blocks mentor messaging actions when the plan lacks messaging entitlements', () => {
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.directMessages,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('loaded', []),
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('feature_not_in_plan');
  });

  it('blocks mentor features for restricted accounts', () => {
    const blockedAccount = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: true,
      isBlocked: true,
    });
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.messagesView,
      {
        isMentor: true,
        accountAccess: blockedAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('account_blocked');
  });

  it('blocks mentor features for inactive accounts before verification or plan checks', () => {
    const inactiveAccount = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: false,
      isBlocked: false,
    });
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.dashboardMessages,
      {
        isMentor: true,
        accountAccess: inactiveAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('account_inactive');
  });

  it('marks subscription-backed mentor features as unavailable when entitlements cannot be resolved', () => {
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('unavailable'),
      }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('subscription_unavailable');
  });

  it('allows admin override across mentor features', () => {
    const policy = buildMentorAccessPolicySnapshot({
      isAdmin: true,
      isMentor: false,
      mentorProfile: null,
    });

    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.scheduleManage)
    ).toBe(true);
    expect(
      isMentorFeatureEnabled(policy, MENTOR_FEATURE_KEYS.analyticsView)
    ).toBe(true);
  });

  it('allows constrained runtime config overrides for mentor verification-gated features', () => {
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'IN_PROGRESS',
          paymentStatus: 'COMPLETED',
        },
        policyConfig: mergeMentorPolicyConfig({
          features: {
            [MENTOR_FEATURE_KEYS.scheduleManage]: {
              verification: {
                IN_PROGRESS: 'ok',
              },
            },
          },
        }),
      }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe('ok');
  });

  it('allows constrained runtime config overrides for inactive mentor account access on safe features', () => {
    const inactiveAccount = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: false,
      isBlocked: false,
    });
    const decision = evaluateMentorFeatureAccess(
      MENTOR_FEATURE_KEYS.subscriptionManage,
      {
        isMentor: true,
        accountAccess: inactiveAccount,
        mentorProfile: {
          verificationStatus: 'IN_PROGRESS',
          paymentStatus: 'PENDING',
        },
        policyConfig: mergeMentorPolicyConfig({
          features: {
            [MENTOR_FEATURE_KEYS.subscriptionManage]: {
              account: {
                inactive: 'ok',
              },
            },
          },
        }),
      }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe('ok');
  });

  it('maps mentor dashboard sections to centralized feature keys', () => {
    expect(getMentorDashboardSectionFeature('schedule')).toBe(
      MENTOR_FEATURE_KEYS.scheduleManage
    );
    expect(getMentorDashboardSectionFeature('messages')).toBe(
      MENTOR_FEATURE_KEYS.messagesView
    );
    expect(getMentorDashboardSectionFeature('dashboard')).toBeNull();
  });
});
