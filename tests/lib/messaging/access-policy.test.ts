import { describe, expect, it } from 'vitest';

import { buildAccountAccessPolicySnapshot } from '@/lib/access-policy/account';
import {
  getMessagingAccessDecision,
  MESSAGING_ACCESS_INTENTS,
} from '@/lib/messaging/access-policy';
import {
  buildMenteeAccessPolicySnapshot,
} from '@/lib/mentee/access-policy';
import {
  buildMentorAccessPolicySnapshot,
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
  featureKeys: string[]
): SubscriptionEntitlementSnapshot {
  const features = featureKeys.map(createPlanFeature);

  return {
    audience,
    state: 'loaded',
    hasSubscription: true,
    features,
    featureRecords: features.map((feature) => ({
      feature_key: feature.feature_key,
      is_included: feature.is_included,
      limit_amount: feature.limit_amount,
    })),
    errorMessage: null,
  };
}

const activeAccount = buildAccountAccessPolicySnapshot({
  isAuthenticated: true,
  isActive: true,
  isBlocked: false,
});

describe('messaging access policy', () => {
  it('grants admin access across messaging intents', () => {
    const decision = getMessagingAccessDecision(
      {
        isAdmin: true,
      },
      MESSAGING_ACCESS_INTENTS.mailbox
    );

    expect(decision.allowed).toBe(true);
    expect(decision.audience).toBe('admin');
  });

  it('uses the mentor mailbox decision when the mentor role is preferred', () => {
    const mentorAccess = buildMentorAccessPolicySnapshot({
      isMentor: true,
      accountAccess: activeAccount,
      mentorProfile: {
        verificationStatus: 'VERIFIED',
        paymentStatus: 'COMPLETED',
      },
    });

    const decision = getMessagingAccessDecision(
      {
        mentorAccess,
        preferredAudience: 'mentor',
      },
      MESSAGING_ACCESS_INTENTS.mailbox
    );

    expect(decision.allowed).toBe(true);
    expect(decision.audience).toBe('mentor');
    expect(decision.label).toBe('Messages');
  });

  it('blocks mentee message requests when the plan lacks the request entitlement', () => {
    const menteeAccess = buildMenteeAccessPolicySnapshot({
      isMentee: true,
      accountAccess: activeAccount,
      subscription: createSubscriptionSnapshot('mentee', []),
    });

    const decision = getMessagingAccessDecision(
      {
        menteeAccess,
        preferredAudience: 'mentee',
      },
      MESSAGING_ACCESS_INTENTS.messageRequests,
      'mentee'
    );

    expect(decision.allowed).toBe(false);
    expect(decision.audience).toBe('mentee');
    expect(decision.reasonCode).toBe('feature_not_in_plan');
  });

  it('allows mentor direct messaging when the messaging entitlement is present', () => {
    const mentorAccess = buildMentorAccessPolicySnapshot({
      isMentor: true,
      accountAccess: activeAccount,
      mentorProfile: {
        verificationStatus: 'IN_PROGRESS',
        paymentStatus: 'PENDING',
      },
      subscription: createSubscriptionSnapshot('mentor', [
        FEATURE_KEYS.DIRECT_MESSAGES_DAILY,
      ]),
    });

    const decision = getMessagingAccessDecision(
      {
        mentorAccess,
        preferredAudience: 'mentor',
      },
      MESSAGING_ACCESS_INTENTS.directMessages,
      'mentor'
    );

    expect(decision.allowed).toBe(true);
    expect(decision.audience).toBe('mentor');
  });
});
