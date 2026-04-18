import { describe, expect, it } from 'vitest';

import {
  buildAdminPoliciesWithDefaults,
  groupAdminPolicies,
} from '@/lib/admin/policies';
import type { SessionPolicy } from '@/lib/db/schema/session-policies';

function buildStoredPolicy(
  overrides: Partial<SessionPolicy> & Pick<SessionPolicy, 'policyKey' | 'policyValue'>
): SessionPolicy {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    policyKey: overrides.policyKey,
    policyValue: overrides.policyValue,
    policyType: overrides.policyType ?? 'integer',
    description: overrides.description ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-03T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-03T00:00:00.000Z'),
  };
}

describe('buildAdminPoliciesWithDefaults', () => {
  it('overrides defaults with stored values and preserves metadata', () => {
    const policies = buildAdminPoliciesWithDefaults([
      buildStoredPolicy({
        policyKey: 'cancellation_cutoff_hours',
        policyValue: '6',
      }),
    ]);

    const cancellationPolicy = policies.find(
      (policy) => policy.key === 'cancellation_cutoff_hours'
    );
    const mentorPolicy = policies.find(
      (policy) => policy.key === 'mentor_cancellation_cutoff_hours'
    );

    expect(cancellationPolicy?.value).toBe('6');
    expect(cancellationPolicy?.defaultValue).toBe('2');
    expect(mentorPolicy?.value).toBe('1');
  });
});

describe('groupAdminPolicies', () => {
  it('groups policies into the expected dashboard sections', () => {
    const grouped = groupAdminPolicies(
      buildAdminPoliciesWithDefaults([
        buildStoredPolicy({
          policyKey: 'max_counter_proposals',
          policyValue: '5',
        }),
      ])
    );

    expect(grouped.menteeRules.some((policy) => policy.key === 'cancellation_cutoff_hours')).toBe(true);
    expect(grouped.mentorRules.some((policy) => policy.key === 'mentor_reschedule_cutoff_hours')).toBe(true);
    expect(grouped.refundRules.some((policy) => policy.key === 'partial_refund_percentage')).toBe(true);
    expect(grouped.rescheduleSettings.some((policy) => policy.key === 'max_counter_proposals')).toBe(true);
  });
});
