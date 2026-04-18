import {
  ACCOUNT_ACCESS_REASON_CODES,
  ACCOUNT_CONFIGURABLE_STATUSES,
  ACCOUNT_LIFECYCLE_STATUSES,
  type AccountAccessReasonCode,
  type AccountLifecycleStatus,
} from '@/lib/access-policy/account';
import {
  MENTEE_SUBSCRIPTION_POLICY_RULE_CODES,
  MENTEE_SUBSCRIPTION_POLICY_STATES,
  type MenteeSubscriptionPolicyRuleCode,
  type MenteeSubscriptionPolicyState,
} from '@/lib/mentee/access-policy';
import {
  MENTOR_PAYMENT_POLICY_RULE_CODES,
  MENTOR_PAYMENT_STATUSES,
  MENTOR_SUBSCRIPTION_POLICY_RULE_CODES,
  MENTOR_SUBSCRIPTION_POLICY_STATES,
  MENTOR_VERIFICATION_POLICY_RULE_CODES,
  MENTOR_VERIFICATION_STATUSES,
  type MentorPaymentPolicyRuleCode,
  type MentorPaymentStatus,
  type MentorSubscriptionPolicyRuleCode,
  type MentorSubscriptionPolicyState,
  type MentorVerificationLifecycleStatus,
  type MentorVerificationPolicyRuleCode,
} from '@/lib/mentor/access-policy';

export type AccessPolicyAudience = 'mentor' | 'mentee';
export type AccessPolicyAxisKey =
  | 'account'
  | 'verification'
  | 'payment'
  | 'subscription';

export interface AccessPolicyStateDefinition<TState extends string = string> {
  state: TState;
  label: string;
  description: string;
  configurable: boolean;
}

export interface AccessPolicyAxisDefinition<
  TState extends string = string,
  TRuleCode extends string = string,
> {
  key: AccessPolicyAxisKey;
  label: string;
  description: string;
  states: readonly AccessPolicyStateDefinition<TState>[];
  ruleCodes: readonly TRuleCode[];
}

export const ACCOUNT_LIFECYCLE_STATE_DEFINITIONS = [
  {
    state: 'anonymous',
    label: 'Anonymous',
    description: 'No authenticated account is available for the request.',
    configurable: true,
  },
  {
    state: 'active',
    label: 'Active',
    description: 'The account is authenticated, active, and not blocked.',
    configurable: false,
  },
  {
    state: 'inactive',
    label: 'Inactive',
    description: 'The account exists but is not currently active.',
    configurable: true,
  },
  {
    state: 'blocked',
    label: 'Blocked',
    description: 'The account is explicitly restricted by the platform.',
    configurable: true,
  },
  {
    state: 'unavailable',
    label: 'Unavailable',
    description: 'The account flags could not be resolved safely.',
    configurable: true,
  },
] as const satisfies readonly AccessPolicyStateDefinition<AccountLifecycleStatus>[];

export const MENTOR_VERIFICATION_STATE_DEFINITIONS = [
  {
    state: 'YET_TO_APPLY',
    label: 'Yet to apply',
    description: 'The mentor has not submitted a verification application.',
    configurable: true,
  },
  {
    state: 'IN_PROGRESS',
    label: 'In progress',
    description: 'The mentor application is submitted and under review.',
    configurable: true,
  },
  {
    state: 'VERIFIED',
    label: 'Verified',
    description: 'The mentor has passed verification.',
    configurable: true,
  },
  {
    state: 'REJECTED',
    label: 'Rejected',
    description: 'The application was reviewed and not approved.',
    configurable: true,
  },
  {
    state: 'REVERIFICATION',
    label: 'Reverification',
    description: 'The mentor must take action before approval continues.',
    configurable: true,
  },
  {
    state: 'RESUBMITTED',
    label: 'Resubmitted',
    description: 'The mentor resubmitted after a requested change.',
    configurable: true,
  },
  {
    state: 'UPDATED_PROFILE',
    label: 'Updated profile',
    description: 'The mentor changed profile data that needs review.',
    configurable: true,
  },
  {
    state: 'UNKNOWN',
    label: 'Unknown',
    description: 'The stored verification status is not recognized.',
    configurable: true,
  },
] as const satisfies readonly AccessPolicyStateDefinition<MentorVerificationLifecycleStatus>[];

export const MENTOR_PAYMENT_STATE_DEFINITIONS = [
  {
    state: 'PENDING',
    label: 'Pending',
    description: 'The mentor activation payment is not completed yet.',
    configurable: true,
  },
  {
    state: 'COMPLETED',
    label: 'Completed',
    description: 'The mentor activation payment is completed.',
    configurable: true,
  },
  {
    state: 'FAILED',
    label: 'Failed',
    description: 'The mentor activation payment failed.',
    configurable: true,
  },
  {
    state: 'REFUNDED',
    label: 'Refunded',
    description: 'The mentor activation payment was refunded.',
    configurable: true,
  },
  {
    state: 'CANCELLED',
    label: 'Cancelled',
    description: 'The mentor activation payment was cancelled.',
    configurable: true,
  },
  {
    state: 'UNKNOWN',
    label: 'Unknown',
    description: 'The stored payment status is not recognized.',
    configurable: true,
  },
] as const satisfies readonly AccessPolicyStateDefinition<MentorPaymentStatus>[];

const SUBSCRIPTION_STATE_DEFINITIONS = [
  {
    state: 'missing',
    label: 'Missing',
    description: 'No active subscription exists for this audience.',
    configurable: true,
  },
  {
    state: 'notInPlan',
    label: 'Not in plan',
    description: 'A plan is loaded, but it does not include this feature.',
    configurable: true,
  },
  {
    state: 'unavailable',
    label: 'Unavailable',
    description: 'Subscription entitlements could not be resolved safely.',
    configurable: true,
  },
] as const;

export const MENTOR_SUBSCRIPTION_STATE_DEFINITIONS =
  SUBSCRIPTION_STATE_DEFINITIONS satisfies readonly AccessPolicyStateDefinition<MentorSubscriptionPolicyState>[];

export const MENTEE_SUBSCRIPTION_STATE_DEFINITIONS =
  SUBSCRIPTION_STATE_DEFINITIONS satisfies readonly AccessPolicyStateDefinition<MenteeSubscriptionPolicyState>[];

function isConfigurableAccountStatus(
  state: AccountLifecycleStatus
): state is (typeof ACCOUNT_CONFIGURABLE_STATUSES)[number] {
  return (ACCOUNT_CONFIGURABLE_STATUSES as readonly AccountLifecycleStatus[])
    .includes(state);
}

function isConfigurableAccountStateDefinition(
  definition: AccessPolicyStateDefinition<AccountLifecycleStatus>
): definition is AccessPolicyStateDefinition<
  (typeof ACCOUNT_CONFIGURABLE_STATUSES)[number]
> {
  return isConfigurableAccountStatus(definition.state);
}

const CONFIGURABLE_ACCOUNT_LIFECYCLE_STATE_DEFINITIONS =
  ACCOUNT_LIFECYCLE_STATE_DEFINITIONS.filter(
    isConfigurableAccountStateDefinition
  ) as readonly AccessPolicyStateDefinition<
    (typeof ACCOUNT_CONFIGURABLE_STATUSES)[number]
  >[];

export const ACCESS_POLICY_AXIS_DEFINITIONS = {
  mentor: {
    account: {
      key: 'account',
      label: 'Account lifecycle',
      description:
        'Authentication, inactive, blocked, and safety-unavailable account states.',
      states: CONFIGURABLE_ACCOUNT_LIFECYCLE_STATE_DEFINITIONS,
      ruleCodes: ACCOUNT_ACCESS_REASON_CODES,
    } satisfies AccessPolicyAxisDefinition<
      Exclude<AccountLifecycleStatus, 'active'>,
      AccountAccessReasonCode
    >,
    verification: {
      key: 'verification',
      label: 'Mentor verification',
      description: 'Mentor application and review lifecycle states.',
      states: MENTOR_VERIFICATION_STATE_DEFINITIONS,
      ruleCodes: MENTOR_VERIFICATION_POLICY_RULE_CODES,
    } satisfies AccessPolicyAxisDefinition<
      MentorVerificationLifecycleStatus,
      MentorVerificationPolicyRuleCode
    >,
    payment: {
      key: 'payment',
      label: 'Mentor activation payment',
      description: 'Payment state for mentor activation requirements.',
      states: MENTOR_PAYMENT_STATE_DEFINITIONS,
      ruleCodes: MENTOR_PAYMENT_POLICY_RULE_CODES,
    } satisfies AccessPolicyAxisDefinition<
      MentorPaymentStatus,
      MentorPaymentPolicyRuleCode
    >,
    subscription: {
      key: 'subscription',
      label: 'Mentor subscription',
      description: 'Plan and feature-entitlement state for mentor capabilities.',
      states: MENTOR_SUBSCRIPTION_STATE_DEFINITIONS,
      ruleCodes: MENTOR_SUBSCRIPTION_POLICY_RULE_CODES,
    } satisfies AccessPolicyAxisDefinition<
      MentorSubscriptionPolicyState,
      MentorSubscriptionPolicyRuleCode
    >,
  },
  mentee: {
    account: {
      key: 'account',
      label: 'Account lifecycle',
      description:
        'Authentication, inactive, blocked, and safety-unavailable account states.',
      states: CONFIGURABLE_ACCOUNT_LIFECYCLE_STATE_DEFINITIONS,
      ruleCodes: ACCOUNT_ACCESS_REASON_CODES,
    } satisfies AccessPolicyAxisDefinition<
      Exclude<AccountLifecycleStatus, 'active'>,
      AccountAccessReasonCode
    >,
    subscription: {
      key: 'subscription',
      label: 'Mentee subscription',
      description: 'Plan and feature-entitlement state for mentee capabilities.',
      states: MENTEE_SUBSCRIPTION_STATE_DEFINITIONS,
      ruleCodes: MENTEE_SUBSCRIPTION_POLICY_RULE_CODES,
    } satisfies AccessPolicyAxisDefinition<
      MenteeSubscriptionPolicyState,
      MenteeSubscriptionPolicyRuleCode
    >,
  },
} as const;

export const ACCESS_POLICY_LIFECYCLE_MODEL = {
  accountStatuses: ACCOUNT_LIFECYCLE_STATUSES,
  configurableAccountStatuses: ACCOUNT_CONFIGURABLE_STATUSES,
  mentorVerificationStatuses: MENTOR_VERIFICATION_STATUSES,
  mentorPaymentStatuses: MENTOR_PAYMENT_STATUSES,
  mentorSubscriptionStates: MENTOR_SUBSCRIPTION_POLICY_STATES,
  menteeSubscriptionStates: MENTEE_SUBSCRIPTION_POLICY_STATES,
  axes: ACCESS_POLICY_AXIS_DEFINITIONS,
} as const;
