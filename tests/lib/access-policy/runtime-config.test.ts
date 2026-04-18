import { describe, expect, it } from 'vitest';

import {
  buildAccessPolicyRuntimeConfig,
  parseAccessPolicyConfigOverrides,
} from '@/lib/access-policy/runtime-config';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';

describe('access policy runtime config', () => {
  it('merges constrained overrides onto the baseline policy matrix', () => {
    const runtimeConfig = buildAccessPolicyRuntimeConfig({
      mentor: {
        features: {
          [MENTOR_FEATURE_KEYS.scheduleManage]: {
            verification: {
              IN_PROGRESS: 'ok',
            },
          },
        },
      },
      mentee: {
        features: {
          [MENTEE_FEATURE_KEYS.learningWorkspace]: {
            subscription: {
              missing: 'ok',
            },
          },
        },
      },
    });

    expect(
      runtimeConfig.mentor.features[MENTOR_FEATURE_KEYS.scheduleManage]
        .verification.IN_PROGRESS
    ).toBe('ok');
    expect(
      runtimeConfig.mentor.features[MENTOR_FEATURE_KEYS.scheduleManage]
        .verification.REJECTED
    ).toBe('not_approved');
    expect(
      runtimeConfig.mentee.features[MENTEE_FEATURE_KEYS.learningWorkspace]
        .subscription?.missing
    ).toBe('ok');
    expect(
      runtimeConfig.mentee.features[MENTEE_FEATURE_KEYS.learningWorkspace]
        .subscription?.notInPlan
    ).toBe('feature_not_in_plan');
  });

  it('rejects invalid override payloads', () => {
    const parsed = parseAccessPolicyConfigOverrides({
      mentor: {
        features: {
          [MENTOR_FEATURE_KEYS.scheduleManage]: {
            verification: {
              IN_PROGRESS: 'not_a_real_reason',
            },
          },
        },
      },
    });

    expect(parsed).toBeNull();
  });

  it('rejects unsupported lifecycle states instead of making them dynamic', () => {
    const parsed = parseAccessPolicyConfigOverrides({
      mentee: {
        features: {
          [MENTEE_FEATURE_KEYS.learningWorkspace]: {
            subscription: {
              payment_delinquent: 'subscription_required',
            },
          },
        },
      },
    });

    expect(parsed).toBeNull();
  });
});
