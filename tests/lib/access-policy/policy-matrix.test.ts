import { describe, expect, it } from 'vitest';

import { buildAccountAccessPolicySnapshot } from '@/lib/access-policy/account';
import {
  evaluateMenteeFeatureAccess,
  MENTEE_FEATURE_KEYS,
} from '@/lib/mentee/access-policy';
import {
  evaluateMentorFeatureAccess,
  MENTOR_FEATURE_KEYS,
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
  audience: 'mentor' | 'mentee',
  state: SubscriptionEntitlementSnapshot['state'],
  featureKeys: string[] = []
): SubscriptionEntitlementSnapshot {
  const features = featureKeys.map(createPlanFeature);

  return {
    audience,
    state,
    hasSubscription: state === 'loaded',
    features,
    featureRecords: features.map((feature) => ({
      feature_key: feature.feature_key,
      is_included: feature.is_included,
      limit_amount: feature.limit_amount,
    })),
    errorMessage:
      state === 'missing' ? `No active ${audience} subscription` : null,
  };
}

const activeAccount = buildAccountAccessPolicySnapshot({
  isAuthenticated: true,
  isActive: true,
  isBlocked: false,
});

describe('policy matrix', () => {
  it.each([
    [
      'anonymous users',
      {
        isAuthenticated: false,
        isActive: true,
        isBlocked: false,
      },
      'authentication_required',
      'anonymous',
      false,
    ],
    [
      'accounts with unavailable lifecycle flags',
      {
        isAuthenticated: true,
      },
      'account_state_unavailable',
      'unavailable',
      false,
    ],
    [
      'blocked accounts without override',
      {
        isAuthenticated: true,
        isActive: true,
        isBlocked: true,
      },
      'account_blocked',
      'blocked',
      false,
    ],
    [
      'inactive accounts without override',
      {
        isAuthenticated: true,
        isActive: false,
        isBlocked: false,
      },
      'account_inactive',
      'inactive',
      false,
    ],
    [
      'inactive accounts with explicit override',
      {
        isAuthenticated: true,
        isActive: false,
        isBlocked: false,
        overrideScopes: ['inactive'] as const,
      },
      'ok',
      'active',
      true,
    ],
    [
      'blocked accounts with explicit override',
      {
        isAuthenticated: true,
        isActive: true,
        isBlocked: true,
        overrideScopes: ['blocked'] as const,
      },
      'ok',
      'active',
      true,
    ],
  ])(
    'evaluates account policy for %s',
    (_label, context, expectedReasonCode, expectedStatus, expectedAllowed) => {
      const snapshot = buildAccountAccessPolicySnapshot(context);

      expect(snapshot.reasonCode).toBe(expectedReasonCode);
      expect(snapshot.status).toBe(expectedStatus);
      expect(snapshot.allowed).toBe(expectedAllowed);
    }
  );

  it.each([
    [
      'requires the mentor role before any other checks',
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: false,
        accountAccess: activeAccount,
      },
      'mentor_role_required',
    ],
    [
      'prioritizes blocked account state',
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: buildAccountAccessPolicySnapshot({
          isAuthenticated: true,
          isActive: true,
          isBlocked: true,
        }),
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('mentor', 'loaded', [
          FEATURE_KEYS.ANALYTICS_ACCESS_LEVEL,
        ]),
      },
      'account_blocked',
    ],
    [
      'requires an application before verified-only features unlock',
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: null,
      },
      'application_required',
    ],
    [
      'requires verification before schedule management',
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'IN_PROGRESS',
          paymentStatus: 'COMPLETED',
        },
      },
      'verification_pending',
    ],
    [
      'requires completed payment after verification succeeds',
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'PENDING',
        },
      },
      'payment_required',
    ],
    [
      'requires a mentor subscription when the plan is missing',
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('mentor', 'missing'),
      },
      'subscription_required',
    ],
    [
      'requires the analytics entitlement when the plan is loaded without it',
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('mentor', 'loaded'),
      },
      'feature_not_in_plan',
    ],
    [
      'surfaces unavailable subscription state when entitlements cannot be resolved',
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('mentor', 'unavailable'),
      },
      'subscription_unavailable',
    ],
  ])(
    'evaluates mentor feature access when it %s',
    (_label, feature, context, expectedReasonCode) => {
      const decision = evaluateMentorFeatureAccess(feature, context);

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(expectedReasonCode);
    }
  );

  it.each([
    [
      'verification override',
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'IN_PROGRESS',
          paymentStatus: 'COMPLETED',
        },
        overrideScopes: ['verification'] as const,
      },
    ],
    [
      'payment override',
      MENTOR_FEATURE_KEYS.scheduleManage,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'PENDING',
        },
        overrideScopes: ['payment'] as const,
      },
    ],
    [
      'subscription override',
      MENTOR_FEATURE_KEYS.analyticsView,
      {
        isMentor: true,
        accountAccess: activeAccount,
        mentorProfile: {
          verificationStatus: 'VERIFIED',
          paymentStatus: 'COMPLETED',
        },
        subscription: createSubscriptionSnapshot('mentor', 'missing'),
        overrideScopes: ['subscription'] as const,
      },
    ],
    [
      'account override',
      MENTOR_FEATURE_KEYS.messagesView,
      {
        isMentor: true,
        accountAccess: buildAccountAccessPolicySnapshot({
          isAuthenticated: true,
          isActive: false,
          isBlocked: false,
        }),
        mentorProfile: {
          verificationStatus: 'IN_PROGRESS',
          paymentStatus: 'PENDING',
        },
        overrideScopes: ['account'] as const,
      },
    ],
  ])(
    'allows mentor access with a %s',
    (_label, feature, context) => {
      const decision = evaluateMentorFeatureAccess(feature, context);

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe('ok');
    }
  );

  it.each([
    [
      'requires the mentee role before other checks',
      MENTEE_FEATURE_KEYS.learningWorkspace,
      {
        isMentee: false,
        accountAccess: activeAccount,
      },
      'mentee_role_required',
    ],
    [
      'prioritizes blocked account state',
      MENTEE_FEATURE_KEYS.learningWorkspace,
      {
        isMentee: true,
        accountAccess: buildAccountAccessPolicySnapshot({
          isAuthenticated: true,
          isActive: true,
          isBlocked: true,
        }),
        subscription: createSubscriptionSnapshot('mentee', 'loaded', [
          FEATURE_KEYS.COURSES_ACCESS,
        ]),
      },
      'account_blocked',
    ],
    [
      'requires a mentee subscription for the learning workspace',
      MENTEE_FEATURE_KEYS.learningWorkspace,
      {
        isMentee: true,
        accountAccess: activeAccount,
        subscription: createSubscriptionSnapshot('mentee', 'missing'),
      },
      'subscription_required',
    ],
    [
      'requires the course entitlement when the plan is loaded without it',
      MENTEE_FEATURE_KEYS.learningWorkspace,
      {
        isMentee: true,
        accountAccess: activeAccount,
        subscription: createSubscriptionSnapshot('mentee', 'loaded'),
      },
      'feature_not_in_plan',
    ],
    [
      'surfaces unavailable subscription state when entitlements cannot be resolved',
      MENTEE_FEATURE_KEYS.learningWorkspace,
      {
        isMentee: true,
        accountAccess: activeAccount,
        subscription: createSubscriptionSnapshot('mentee', 'unavailable'),
      },
      'subscription_unavailable',
    ],
  ])(
    'evaluates mentee feature access when it %s',
    (_label, feature, context, expectedReasonCode) => {
      const decision = evaluateMenteeFeatureAccess(feature, context);

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(expectedReasonCode);
    }
  );

  it.each([
    [
      'account override',
      MENTEE_FEATURE_KEYS.messagesView,
      {
        isMentee: true,
        accountAccess: buildAccountAccessPolicySnapshot({
          isAuthenticated: true,
          isActive: false,
          isBlocked: false,
        }),
        overrideScopes: ['account'] as const,
      },
    ],
    [
      'subscription override',
      MENTEE_FEATURE_KEYS.learningWorkspace,
      {
        isMentee: true,
        accountAccess: activeAccount,
        subscription: createSubscriptionSnapshot('mentee', 'missing'),
        overrideScopes: ['subscription'] as const,
      },
    ],
  ])(
    'allows mentee access with a %s',
    (_label, feature, context) => {
      const decision = evaluateMenteeFeatureAccess(feature, context);

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe('ok');
    }
  );
});
