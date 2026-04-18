import { DEFAULT_SESSION_POLICIES, type SessionPolicy } from '@/lib/db/schema/session-policies';

export interface AdminPolicyRecord {
  key: string;
  value: string;
  type: string;
  description: string;
  defaultValue: string;
}

const MENTEE_RULE_KEYS = [
  'cancellation_cutoff_hours',
  'reschedule_cutoff_hours',
  'max_reschedules_per_session',
];

const MENTOR_RULE_KEYS = [
  'mentor_cancellation_cutoff_hours',
  'mentor_reschedule_cutoff_hours',
  'mentor_max_reschedules_per_session',
];

const REFUND_RULE_KEYS = [
  'free_cancellation_hours',
  'partial_refund_percentage',
  'late_cancellation_refund_percentage',
  'require_cancellation_reason',
];

const RESCHEDULE_SETTING_KEYS = [
  'reschedule_request_expiry_hours',
  'max_counter_proposals',
];

export function getAdminPolicyDefinitions() {
  return Object.values(DEFAULT_SESSION_POLICIES);
}

export function getValidAdminPolicyKeys() {
  return new Set(getAdminPolicyDefinitions().map((policy) => policy.key));
}

export function buildAdminPoliciesWithDefaults(storedRows: SessionPolicy[]) {
  const storedByKey = new Map(storedRows.map((row) => [row.policyKey, row]));

  return getAdminPolicyDefinitions().map((definition) => {
    const storedRow = storedByKey.get(definition.key);
    return {
      key: definition.key,
      value: storedRow?.policyValue ?? definition.value,
      type: definition.type,
      description: definition.description,
      defaultValue: definition.value,
    } satisfies AdminPolicyRecord;
  });
}

export function groupAdminPolicies(policies: AdminPolicyRecord[]) {
  return {
    menteeRules: policies.filter((policy) => MENTEE_RULE_KEYS.includes(policy.key)),
    mentorRules: policies.filter((policy) => MENTOR_RULE_KEYS.includes(policy.key)),
    refundRules: policies.filter((policy) => REFUND_RULE_KEYS.includes(policy.key)),
    rescheduleSettings: policies.filter((policy) =>
      RESCHEDULE_SETTING_KEYS.includes(policy.key)
    ),
  };
}
