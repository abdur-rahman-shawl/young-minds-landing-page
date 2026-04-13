import type { VerificationStatus } from '@/lib/db/schema/mentors';
import type { DashboardSectionKey } from '@/lib/dashboard/sections';
import type {
  AccountAccessPolicySnapshot,
  AccountAccessReasonCode,
  AccountLifecycleStatus,
} from '@/lib/access-policy/account';
import type { FeatureKey } from '@/lib/subscriptions/feature-keys';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import {
  hasSubscriptionEntitlement,
  type SubscriptionEntitlementSnapshot,
} from '@/lib/subscriptions/entitlement-snapshot';

export const MENTOR_FEATURE_KEYS = {
  dashboardStats: 'dashboard.stats',
  dashboardSessions: 'dashboard.sessions',
  dashboardReviews: 'dashboard.reviews',
  dashboardMessages: 'dashboard.messages',
  dashboardProfile: 'dashboard.profile',
  menteesView: 'mentees.view',
  scheduleManage: 'schedule.manage',
  availabilityManage: 'availability.manage',
  reviewsManage: 'reviews.manage',
  analyticsView: 'analytics.view',
  recordingsView: 'recordings.view',
  messagesView: 'messages.view',
  directMessages: 'messages.direct',
  messageRequests: 'messages.requests',
  profileManage: 'profile.manage',
  subscriptionManage: 'subscription.manage',
  contentManage: 'content.manage',
} as const;

export type MentorFeatureKey =
  (typeof MENTOR_FEATURE_KEYS)[keyof typeof MENTOR_FEATURE_KEYS];

export const MENTOR_OVERRIDE_SCOPES = {
  all: 'all',
  account: 'account',
  verification: 'verification',
  payment: 'payment',
  subscription: 'subscription',
} as const;

export type MentorOverrideScope =
  (typeof MENTOR_OVERRIDE_SCOPES)[keyof typeof MENTOR_OVERRIDE_SCOPES];

export type MentorVerificationLifecycleStatus =
  | VerificationStatus
  | 'UNKNOWN';

export const MENTOR_VERIFICATION_STATUSES = [
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'VERIFIED',
  'REJECTED',
  'REVERIFICATION',
  'RESUBMITTED',
  'UPDATED_PROFILE',
  'UNKNOWN',
] as const satisfies readonly MentorVerificationLifecycleStatus[];

export type MentorPaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'UNKNOWN';

export const MENTOR_PAYMENT_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
  'UNKNOWN',
] as const satisfies readonly MentorPaymentStatus[];

export type MentorAccessMode = 'full' | 'blocked' | 'read_only';

export type MentorAccessReasonCode =
  | 'ok'
  | 'mentor_role_required'
  | AccountAccessReasonCode
  | 'application_required'
  | 'verification_pending'
  | 'action_required'
  | 'not_approved'
  | 'payment_required'
  | 'subscription_required'
  | 'feature_not_in_plan'
  | 'subscription_unavailable'
  | 'status_unavailable';

export type MentorVerificationPolicyRuleCode =
  | 'ok'
  | 'application_required'
  | 'verification_pending'
  | 'action_required'
  | 'not_approved'
  | 'status_unavailable';

export const MENTOR_VERIFICATION_POLICY_RULE_CODES = [
  'ok',
  'application_required',
  'verification_pending',
  'action_required',
  'not_approved',
  'status_unavailable',
] as const satisfies readonly MentorVerificationPolicyRuleCode[];

export type MentorPaymentPolicyRuleCode = 'ok' | 'payment_required';

export const MENTOR_PAYMENT_POLICY_RULE_CODES = [
  'ok',
  'payment_required',
] as const satisfies readonly MentorPaymentPolicyRuleCode[];

export type MentorSubscriptionPolicyState = 'missing' | 'notInPlan' | 'unavailable';

export const MENTOR_SUBSCRIPTION_POLICY_STATES = [
  'missing',
  'notInPlan',
  'unavailable',
] as const satisfies readonly MentorSubscriptionPolicyState[];

export type MentorSubscriptionPolicyRuleCode =
  | 'ok'
  | 'subscription_required'
  | 'feature_not_in_plan'
  | 'subscription_unavailable';

export const MENTOR_SUBSCRIPTION_POLICY_RULE_CODES = [
  'ok',
  'subscription_required',
  'feature_not_in_plan',
  'subscription_unavailable',
] as const satisfies readonly MentorSubscriptionPolicyRuleCode[];

export type MentorAccountPolicyRuleCode = AccountAccessReasonCode;

export interface MentorFeaturePolicyMatrix {
  account: Partial<
    Record<Extract<AccountLifecycleStatus, 'anonymous' | 'inactive' | 'blocked' | 'unavailable'>, MentorAccountPolicyRuleCode>
  >;
  verification: Partial<
    Record<MentorVerificationLifecycleStatus, MentorVerificationPolicyRuleCode>
  >;
  payment: Partial<Record<MentorPaymentStatus, MentorPaymentPolicyRuleCode>>;
  subscription?: Partial<
    Record<MentorSubscriptionPolicyState, MentorSubscriptionPolicyRuleCode>
  >;
}

export interface MentorFeaturePolicyMatrixOverrides {
  account?: MentorFeaturePolicyMatrix['account'];
  verification?: MentorFeaturePolicyMatrix['verification'];
  payment?: MentorFeaturePolicyMatrix['payment'];
  subscription?: MentorFeaturePolicyMatrix['subscription'];
}

export interface MentorPolicyConfig {
  features: Record<MentorFeatureKey, MentorFeaturePolicyMatrix>;
}

export interface MentorPolicyConfigOverrides {
  features?: Partial<Record<MentorFeatureKey, MentorFeaturePolicyMatrixOverrides>>;
}

export interface MentorAccessProfile {
  verificationStatus?: string | null;
  verificationNotes?: string | null;
  paymentStatus?: string | null;
}

export interface MentorAccessContext {
  isMentor?: boolean;
  isAdmin?: boolean;
  mentorProfile?: MentorAccessProfile | null;
  accountAccess?: AccountAccessPolicySnapshot | null;
  subscription?: SubscriptionEntitlementSnapshot | null;
  overrideScopes?: readonly MentorOverrideScope[] | null;
  policyConfig?: MentorPolicyConfig | null;
}

export interface MentorFeatureDefinition {
  key: MentorFeatureKey;
  label: string;
  blockedSummary: string;
  capabilities: string[];
  requiresVerifiedMentor: boolean;
  requiresCompletedPayment: boolean;
  subscriptionFeatureKey?: FeatureKey;
}

export interface MentorFeatureAccessDecision {
  key: MentorFeatureKey;
  label: string;
  mode: MentorAccessMode;
  allowed: boolean;
  requiresVerifiedMentor: boolean;
  requiresCompletedPayment: boolean;
  verificationStatus: MentorVerificationLifecycleStatus;
  paymentStatus: MentorPaymentStatus;
  reasonCode: MentorAccessReasonCode;
  blockedSummary: string;
  capabilities: string[];
  subscriptionFeatureKey: FeatureKey | null;
  hasSubscriptionEntitlement: boolean | null;
}

export interface MentorAccessPolicySnapshot {
  isMentor: boolean;
  isAdmin: boolean;
  verificationStatus: MentorVerificationLifecycleStatus;
  paymentStatus: MentorPaymentStatus;
  isVerified: boolean;
  hasActiveSubscription: boolean;
  hasRestrictedFeatures: boolean;
  restrictedReasonCodes: MentorAccessReasonCode[];
  features: Record<MentorFeatureKey, MentorFeatureAccessDecision>;
}

export const MENTOR_FEATURE_DEFINITIONS: Record<
  MentorFeatureKey,
  MentorFeatureDefinition
> = {
  [MENTOR_FEATURE_KEYS.dashboardStats]: {
    key: MENTOR_FEATURE_KEYS.dashboardStats,
    label: 'Dashboard insights',
    blockedSummary:
      'Performance metrics stay protected until mentor verification and activation are complete.',
    capabilities: [
      'Track mentee volume, ratings, and earnings at a glance',
      'Monitor active mentorship load and upcoming activity',
      'Review verified mentor performance without exposing restricted metrics',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.dashboardSessions]: {
    key: MENTOR_FEATURE_KEYS.dashboardSessions,
    label: 'Recent sessions',
    blockedSummary:
      'Session operations remain locked until mentor verification and activation are complete.',
    capabilities: [
      'See upcoming mentoring sessions and session status',
      'Open schedule workflows and session actions',
      'Manage mentor operations from the dashboard',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.dashboardReviews]: {
    key: MENTOR_FEATURE_KEYS.dashboardReviews,
    label: 'Review queue',
    blockedSummary:
      'Feedback workflows unlock after mentor verification and activation are complete.',
    capabilities: [
      'Review pending feedback tasks after completed sessions',
      'Manage post-session mentor responsibilities',
      'Keep mentor quality workflows active once approved',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.dashboardMessages]: {
    key: MENTOR_FEATURE_KEYS.dashboardMessages,
    label: 'Recent messages',
    blockedSummary:
      'Recent messages remain available while your mentor onboarding is in progress.',
    capabilities: [
      'Stay in touch with existing conversations',
      'Review recent communication activity',
      'Coordinate profile or support follow-ups while onboarding',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
  },
  [MENTOR_FEATURE_KEYS.dashboardProfile]: {
    key: MENTOR_FEATURE_KEYS.dashboardProfile,
    label: 'Profile summary',
    blockedSummary:
      'Profile management remains available while your mentor onboarding is in progress.',
    capabilities: [
      'Review and refine your mentor profile details',
      'Prepare verification updates and profile improvements',
      'Keep onboarding progress visible in one place',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
  },
  [MENTOR_FEATURE_KEYS.menteesView]: {
    key: MENTOR_FEATURE_KEYS.menteesView,
    label: 'Mentee management',
    blockedSummary:
      'Mentee operations unlock after mentor verification and activation are complete.',
    capabilities: [
      'View and manage your mentee roster',
      'Track active, past, and upcoming mentor relationships',
      'Open mentee-specific mentor workflows',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.scheduleManage]: {
    key: MENTOR_FEATURE_KEYS.scheduleManage,
    label: 'Schedule management',
    blockedSummary:
      'Schedule access stays protected until mentor verification and activation are complete.',
    capabilities: [
      'View scheduled sessions and session details',
      'Manage reschedules, cancellations, and meeting actions',
      'Operate your live mentor session calendar',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.availabilityManage]: {
    key: MENTOR_FEATURE_KEYS.availabilityManage,
    label: 'Availability management',
    blockedSummary:
      'Availability stays protected until mentor verification and activation are complete.',
    capabilities: [
      'Publish bookable hours and booking windows',
      'Manage templates, exceptions, and buffers',
      'Expose availability only for verified mentors',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.reviewsManage]: {
    key: MENTOR_FEATURE_KEYS.reviewsManage,
    label: 'Reviews',
    blockedSummary:
      'Review workflows unlock after mentor verification and activation are complete.',
    capabilities: [
      'Submit pending session feedback and monitor history',
      'Reply to course and lesson comments',
      'Run mentor quality workflows from one place',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
  },
  [MENTOR_FEATURE_KEYS.analyticsView]: {
    key: MENTOR_FEATURE_KEYS.analyticsView,
    label: 'Analytics',
    blockedSummary:
      'Analytics require mentor verification, activation, and an eligible subscription.',
    capabilities: [
      'Track earnings, ratings, and session performance',
      'Inspect mentor trends with verified operating data',
      'Access mentor analytics alongside subscription controls',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
    subscriptionFeatureKey: FEATURE_KEYS.ANALYTICS_ACCESS_LEVEL,
  },
  [MENTOR_FEATURE_KEYS.recordingsView]: {
    key: MENTOR_FEATURE_KEYS.recordingsView,
    label: 'Session recordings',
    blockedSummary:
      'Session recording access depends on mentor activation and subscription coverage.',
    capabilities: [
      'Replay completed mentorship recordings',
      'Access recording playback from your mentor sessions',
      'Use recording features that match your plan coverage',
    ],
    requiresVerifiedMentor: true,
    requiresCompletedPayment: true,
    subscriptionFeatureKey: FEATURE_KEYS.SESSION_RECORDINGS_ACCESS,
  },
  [MENTOR_FEATURE_KEYS.messagesView]: {
    key: MENTOR_FEATURE_KEYS.messagesView,
    label: 'Messages',
    blockedSummary:
      'Messages remain available while your mentor onboarding is in progress.',
    capabilities: [
      'Continue communication with the workspace message center',
      'Resolve onboarding or support follow-ups',
      'Stay responsive without unlocking restricted mentor operations',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
  },
  [MENTOR_FEATURE_KEYS.directMessages]: {
    key: MENTOR_FEATURE_KEYS.directMessages,
    label: 'Direct messaging',
    blockedSummary:
      'Direct messaging depends on your mentor subscription coverage.',
    capabilities: [
      'Send messages inside active mentor conversations',
      'Continue mentor communication without bypassing plan limits',
      'Keep direct messaging aligned with subscription-backed capacity',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
    subscriptionFeatureKey: FEATURE_KEYS.DIRECT_MESSAGES_DAILY,
  },
  [MENTOR_FEATURE_KEYS.messageRequests]: {
    key: MENTOR_FEATURE_KEYS.messageRequests,
    label: 'Message requests',
    blockedSummary:
      'Starting new message requests depends on your mentor subscription coverage.',
    capabilities: [
      'Request new conversations with mentees through the approved workflow',
      'Respect request limits defined by the mentor plan',
      'Keep new outreach inside the centralized messaging policy',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
    subscriptionFeatureKey: FEATURE_KEYS.MESSAGE_REQUESTS_DAILY,
  },
  [MENTOR_FEATURE_KEYS.profileManage]: {
    key: MENTOR_FEATURE_KEYS.profileManage,
    label: 'Profile management',
    blockedSummary:
      'Profile editing remains available while your mentor onboarding is in progress.',
    capabilities: [
      'Update application details and resubmit changes',
      'Prepare your public mentor presence for approval',
      'Respond to review notes without losing access to editing',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
  },
  [MENTOR_FEATURE_KEYS.subscriptionManage]: {
    key: MENTOR_FEATURE_KEYS.subscriptionManage,
    label: 'Subscription management',
    blockedSummary:
      'Subscription controls remain available while your mentor onboarding is in progress.',
    capabilities: [
      'Manage mentor plan access and billing settings',
      'Review feature coverage while onboarding',
      'Prepare premium features before approval goes live',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
  },
  [MENTOR_FEATURE_KEYS.contentManage]: {
    key: MENTOR_FEATURE_KEYS.contentManage,
    label: 'Content management',
    blockedSummary:
      'Content management depends on your mentor subscription coverage.',
    capabilities: [
      'Build and update mentor content without exposing restricted operations',
      'Prepare learning materials ahead of activation',
      'Respond to content feedback from a single workspace',
    ],
    requiresVerifiedMentor: false,
    requiresCompletedPayment: false,
    subscriptionFeatureKey: FEATURE_KEYS.CONTENT_POSTING_ACCESS,
  },
};

const DEFAULT_MENTOR_ACCOUNT_POLICY: MentorFeaturePolicyMatrix['account'] = {
  anonymous: 'authentication_required',
  inactive: 'account_inactive',
  blocked: 'account_blocked',
  unavailable: 'account_state_unavailable',
};

function buildDefaultMentorVerificationPolicy(
  definition: MentorFeatureDefinition
): MentorFeaturePolicyMatrix['verification'] {
  if (!definition.requiresVerifiedMentor) {
    return Object.fromEntries(
      MENTOR_VERIFICATION_STATUSES.map((status) => [status, 'ok'])
    ) as MentorFeaturePolicyMatrix['verification'];
  }

  return {
    YET_TO_APPLY: 'application_required',
    IN_PROGRESS: 'verification_pending',
    VERIFIED: 'ok',
    REJECTED: 'not_approved',
    REVERIFICATION: 'action_required',
    RESUBMITTED: 'verification_pending',
    UPDATED_PROFILE: 'verification_pending',
    UNKNOWN: 'status_unavailable',
  };
}

function buildDefaultMentorPaymentPolicy(
  definition: MentorFeatureDefinition
): MentorFeaturePolicyMatrix['payment'] {
  if (!definition.requiresCompletedPayment) {
    return Object.fromEntries(
      MENTOR_PAYMENT_STATUSES.map((status) => [status, 'ok'])
    ) as MentorFeaturePolicyMatrix['payment'];
  }

  return {
    PENDING: 'payment_required',
    COMPLETED: 'ok',
    FAILED: 'payment_required',
    REFUNDED: 'payment_required',
    CANCELLED: 'payment_required',
    UNKNOWN: 'payment_required',
  };
}

function buildDefaultMentorSubscriptionPolicy(
  definition: MentorFeatureDefinition
): MentorFeaturePolicyMatrix['subscription'] {
  if (!definition.subscriptionFeatureKey) {
    return undefined;
  }

  return {
    missing: 'subscription_required',
    notInPlan: 'feature_not_in_plan',
    unavailable: 'subscription_unavailable',
  };
}

function buildDefaultMentorFeaturePolicyMatrix(
  definition: MentorFeatureDefinition
): MentorFeaturePolicyMatrix {
  return {
    account: DEFAULT_MENTOR_ACCOUNT_POLICY,
    verification: buildDefaultMentorVerificationPolicy(definition),
    payment: buildDefaultMentorPaymentPolicy(definition),
    subscription: buildDefaultMentorSubscriptionPolicy(definition),
  };
}

export const DEFAULT_MENTOR_POLICY_CONFIG: MentorPolicyConfig = {
  features: Object.values(MENTOR_FEATURE_KEYS).reduce(
    (result, featureKey) => {
      result[featureKey] = buildDefaultMentorFeaturePolicyMatrix(
        MENTOR_FEATURE_DEFINITIONS[featureKey]
      );
      return result;
    },
    {} as Record<MentorFeatureKey, MentorFeaturePolicyMatrix>
  ),
};

function mergeMentorFeaturePolicyMatrix(
  feature: MentorFeatureKey,
  overrides?: MentorFeaturePolicyMatrixOverrides
): MentorFeaturePolicyMatrix {
  const base = DEFAULT_MENTOR_POLICY_CONFIG.features[feature];

  if (!overrides) {
    return {
      account: { ...base.account },
      verification: { ...base.verification },
      payment: { ...base.payment },
      subscription: base.subscription ? { ...base.subscription } : undefined,
    };
  }

  return {
    account: {
      ...base.account,
      ...(overrides.account ?? {}),
    },
    verification: {
      ...base.verification,
      ...(overrides.verification ?? {}),
    },
    payment: {
      ...base.payment,
      ...(overrides.payment ?? {}),
    },
    subscription: base.subscription || overrides.subscription
      ? {
          ...(base.subscription ?? {}),
          ...(overrides.subscription ?? {}),
        }
      : undefined,
  };
}

export function mergeMentorPolicyConfig(
  overrides?: MentorPolicyConfigOverrides | null
): MentorPolicyConfig {
  return {
    features: Object.values(MENTOR_FEATURE_KEYS).reduce(
      (result, featureKey) => {
        result[featureKey] = mergeMentorFeaturePolicyMatrix(
          featureKey,
          overrides?.features?.[featureKey]
        );
        return result;
      },
      {} as Record<MentorFeatureKey, MentorFeaturePolicyMatrix>
    ),
  };
}

export const MENTOR_DASHBOARD_SECTION_FEATURES: Partial<
  Record<DashboardSectionKey, MentorFeatureKey>
> = {
  mentees: MENTOR_FEATURE_KEYS.menteesView,
  schedule: MENTOR_FEATURE_KEYS.scheduleManage,
  availability: MENTOR_FEATURE_KEYS.availabilityManage,
  messages: MENTOR_FEATURE_KEYS.messagesView,
  subscription: MENTOR_FEATURE_KEYS.subscriptionManage,
  reviews: MENTOR_FEATURE_KEYS.reviewsManage,
  analytics: MENTOR_FEATURE_KEYS.analyticsView,
  content: MENTOR_FEATURE_KEYS.contentManage,
  profile: MENTOR_FEATURE_KEYS.profileManage,
};

function normalizeOverrideScopes(
  scopes: readonly MentorOverrideScope[] | null | undefined,
  isAdmin: boolean | undefined
) {
  if (scopes) {
    return scopes;
  }

  return isAdmin ? ([MENTOR_OVERRIDE_SCOPES.all] as const) : [];
}

function hasMentorOverrideScope(
  scopes: readonly MentorOverrideScope[],
  scope: MentorOverrideScope
) {
  return (
    scopes.includes(MENTOR_OVERRIDE_SCOPES.all) || scopes.includes(scope)
  );
}

function allowFeature(
  definition: MentorFeatureDefinition,
  verificationStatus: MentorVerificationLifecycleStatus,
  paymentStatus: MentorPaymentStatus,
  hasFeatureEntitlement: boolean | null
): MentorFeatureAccessDecision {
  return {
    key: definition.key,
    label: definition.label,
    mode: 'full',
    allowed: true,
    requiresVerifiedMentor: definition.requiresVerifiedMentor,
    requiresCompletedPayment: definition.requiresCompletedPayment,
    verificationStatus,
    paymentStatus,
    reasonCode: 'ok',
    blockedSummary: definition.blockedSummary,
    capabilities: definition.capabilities,
    subscriptionFeatureKey: definition.subscriptionFeatureKey ?? null,
    hasSubscriptionEntitlement: hasFeatureEntitlement,
  };
}

function blockFeature(
  definition: MentorFeatureDefinition,
  verificationStatus: MentorVerificationLifecycleStatus,
  paymentStatus: MentorPaymentStatus,
  reasonCode: MentorAccessReasonCode,
  hasFeatureEntitlement: boolean | null
): MentorFeatureAccessDecision {
  return {
    key: definition.key,
    label: definition.label,
    mode: 'blocked',
    allowed: false,
    requiresVerifiedMentor: definition.requiresVerifiedMentor,
    requiresCompletedPayment: definition.requiresCompletedPayment,
    verificationStatus,
    paymentStatus,
    reasonCode,
    blockedSummary: definition.blockedSummary,
    capabilities: definition.capabilities,
    subscriptionFeatureKey: definition.subscriptionFeatureKey ?? null,
    hasSubscriptionEntitlement: hasFeatureEntitlement,
  };
}

function getMentorPolicyConfig(
  config: MentorPolicyConfig | null | undefined
): MentorPolicyConfig {
  if (!config) {
    return DEFAULT_MENTOR_POLICY_CONFIG;
  }

  return config;
}

function getMentorSubscriptionState(
  subscription: SubscriptionEntitlementSnapshot | null | undefined
): MentorSubscriptionPolicyState {
  if (subscription?.state === 'missing') {
    return 'missing';
  }

  if (subscription?.state === 'loaded') {
    return 'notInPlan';
  }

  return 'unavailable';
}

export function normalizeMentorVerificationStatus(
  status: string | null | undefined
): MentorVerificationLifecycleStatus {
  if (!status) {
    return 'YET_TO_APPLY';
  }

  switch (status) {
    case 'YET_TO_APPLY':
    case 'IN_PROGRESS':
    case 'VERIFIED':
    case 'REJECTED':
    case 'REVERIFICATION':
    case 'RESUBMITTED':
    case 'UPDATED_PROFILE':
      return status;
    default:
      return 'UNKNOWN';
  }
}

export function normalizeMentorPaymentStatus(
  status: string | null | undefined
): MentorPaymentStatus {
  if (!status) {
    return 'PENDING';
  }

  switch (status) {
    case 'PENDING':
    case 'COMPLETED':
    case 'FAILED':
    case 'REFUNDED':
    case 'CANCELLED':
      return status;
    default:
      return 'UNKNOWN';
  }
}

export function isMentorVerificationApproved(
  status: string | null | undefined
): boolean {
  return normalizeMentorVerificationStatus(status) === 'VERIFIED';
}

export function isMentorPaymentSettled(
  status: string | null | undefined
): boolean {
  return normalizeMentorPaymentStatus(status) === 'COMPLETED';
}

export function getMentorAccessReasonCode(
  status: MentorVerificationLifecycleStatus
): MentorAccessReasonCode {
  switch (status) {
    case 'VERIFIED':
      return 'ok';
    case 'YET_TO_APPLY':
      return 'application_required';
    case 'IN_PROGRESS':
    case 'RESUBMITTED':
    case 'UPDATED_PROFILE':
      return 'verification_pending';
    case 'REVERIFICATION':
      return 'action_required';
    case 'REJECTED':
      return 'not_approved';
    default:
      return 'status_unavailable';
  }
}

export function isMentorVerificationRestrictedReason(
  reasonCode: MentorAccessReasonCode
) {
  return (
    reasonCode === 'application_required' ||
    reasonCode === 'verification_pending' ||
    reasonCode === 'action_required' ||
    reasonCode === 'not_approved' ||
    reasonCode === 'status_unavailable'
  );
}

function getMentorSubscriptionReasonCode(
  subscription: SubscriptionEntitlementSnapshot | null | undefined
): MentorAccessReasonCode {
  if (subscription?.state === 'missing') {
    return 'subscription_required';
  }

  if (subscription?.state === 'loaded') {
    return 'feature_not_in_plan';
  }

  return 'subscription_unavailable';
}

export function evaluateMentorFeatureAccess(
  feature: MentorFeatureKey,
  context: MentorAccessContext
): MentorFeatureAccessDecision {
  const definition = MENTOR_FEATURE_DEFINITIONS[feature];
  const policyConfig = getMentorPolicyConfig(context.policyConfig);
  const featurePolicy = policyConfig.features[feature];
  const verificationStatus = normalizeMentorVerificationStatus(
    context.mentorProfile?.verificationStatus
  );
  const paymentStatus = normalizeMentorPaymentStatus(
    context.mentorProfile?.paymentStatus
  );
  const overrideScopes = normalizeOverrideScopes(
    context.overrideScopes,
    context.isAdmin
  );
  const hasFeatureEntitlement = definition.subscriptionFeatureKey
    ? hasSubscriptionEntitlement(context.subscription, definition.subscriptionFeatureKey)
    : null;

  if (context.isAdmin && hasMentorOverrideScope(overrideScopes, 'all')) {
    return allowFeature(
      definition,
      verificationStatus,
      paymentStatus,
      hasFeatureEntitlement
    );
  }

  if (!context.isMentor) {
    return blockFeature(
      definition,
      verificationStatus,
      paymentStatus,
      'mentor_role_required',
      hasFeatureEntitlement
    );
  }

  const accountAccess = context.accountAccess;
  if (
    accountAccess &&
    accountAccess.status !== 'active' &&
    !hasMentorOverrideScope(overrideScopes, 'account')
  ) {
    const accountReasonCode = featurePolicy.account[accountAccess.status];

    if (accountReasonCode && accountReasonCode !== 'ok') {
      return blockFeature(
        definition,
        verificationStatus,
        paymentStatus,
        accountReasonCode,
        hasFeatureEntitlement
      );
    }
  }

  if (!hasMentorOverrideScope(overrideScopes, 'verification')) {
    const verificationReasonCode =
      featurePolicy.verification[verificationStatus] ??
      getMentorAccessReasonCode(verificationStatus);

    if (verificationReasonCode !== 'ok') {
      return blockFeature(
        definition,
        verificationStatus,
        paymentStatus,
        verificationReasonCode,
        hasFeatureEntitlement
      );
    }
  }

  if (!hasMentorOverrideScope(overrideScopes, 'payment')) {
    const paymentReasonCode =
      featurePolicy.payment[paymentStatus] ??
      (definition.requiresCompletedPayment ? 'payment_required' : 'ok');

    if (paymentReasonCode !== 'ok') {
      return blockFeature(
        definition,
        verificationStatus,
        paymentStatus,
        paymentReasonCode,
        hasFeatureEntitlement
      );
    }
  }

  if (!definition.subscriptionFeatureKey) {
    return allowFeature(
      definition,
      verificationStatus,
      paymentStatus,
      hasFeatureEntitlement
    );
  }

  if (
    hasFeatureEntitlement === true ||
    hasMentorOverrideScope(overrideScopes, 'subscription')
  ) {
    return allowFeature(
      definition,
      verificationStatus,
      paymentStatus,
      hasFeatureEntitlement
    );
  }

  const subscriptionState = getMentorSubscriptionState(context.subscription);
  const subscriptionReasonCode =
    featurePolicy.subscription?.[subscriptionState] ??
    getMentorSubscriptionReasonCode(context.subscription);

  if (subscriptionReasonCode === 'ok') {
    return allowFeature(
      definition,
      verificationStatus,
      paymentStatus,
      hasFeatureEntitlement
    );
  }

  return blockFeature(
    definition,
    verificationStatus,
    paymentStatus,
    subscriptionReasonCode,
    hasFeatureEntitlement
  );
}

export function buildMentorAccessPolicySnapshot(
  context: MentorAccessContext
): MentorAccessPolicySnapshot {
  const verificationStatus = normalizeMentorVerificationStatus(
    context.mentorProfile?.verificationStatus
  );
  const paymentStatus = normalizeMentorPaymentStatus(
    context.mentorProfile?.paymentStatus
  );

  const features = Object.values(MENTOR_FEATURE_KEYS).reduce(
    (result, feature) => {
      result[feature] = evaluateMentorFeatureAccess(feature, context);
      return result;
    },
    {} as Record<MentorFeatureKey, MentorFeatureAccessDecision>
  );

  const restrictedReasonCodes = Array.from(
    new Set(
      Object.values(features)
        .filter((feature) => !feature.allowed)
        .map((feature) => feature.reasonCode)
    )
  );

  return {
    isMentor: Boolean(context.isMentor),
    isAdmin: Boolean(context.isAdmin),
    verificationStatus,
    paymentStatus,
    isVerified: verificationStatus === 'VERIFIED',
    hasActiveSubscription: context.subscription?.state === 'loaded',
    hasRestrictedFeatures: restrictedReasonCodes.length > 0,
    restrictedReasonCodes,
    features,
  };
}

export function getMentorFeatureDecision(
  snapshot: MentorAccessPolicySnapshot | null | undefined,
  feature: MentorFeatureKey
): MentorFeatureAccessDecision | null {
  return snapshot?.features?.[feature] ?? null;
}

export function isMentorFeatureEnabled(
  snapshot: MentorAccessPolicySnapshot | null | undefined,
  feature: MentorFeatureKey
): boolean {
  return Boolean(getMentorFeatureDecision(snapshot, feature)?.allowed);
}

export function hasMentorVerificationRestrictions(
  snapshot: MentorAccessPolicySnapshot | null | undefined
) {
  return Boolean(
    snapshot?.restrictedReasonCodes.some((reasonCode) =>
      isMentorVerificationRestrictedReason(reasonCode)
    )
  );
}

export function getMentorDashboardSectionFeature(
  section: DashboardSectionKey
): MentorFeatureKey | null {
  return MENTOR_DASHBOARD_SECTION_FEATURES[section] ?? null;
}
