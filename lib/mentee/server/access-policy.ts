import { getUserWithRoles } from '@/lib/db/user-helpers';
import { buildAccountAccessPolicySnapshot } from '@/lib/access-policy/account';
import {
  buildMenteeAccessPolicySnapshot,
  getMenteeFeatureDecision,
  type MenteePolicyConfig,
  type MenteeAccessPolicySnapshot,
  type MenteeAccessReasonCode,
  type MenteeFeatureAccessDecision,
  type MenteeFeatureKey,
} from '@/lib/mentee/access-policy';
import { resolveSubscriptionEntitlements } from '@/lib/subscriptions/entitlements';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export interface MenteeFeatureAccessFailure {
  status: number;
  message: string;
  reasonCode: MenteeAccessReasonCode;
  feature: MenteeFeatureKey;
}

async function getMenteeAccessUser(
  userId: string,
  currentUser?: CurrentUser
): Promise<CurrentUser> {
  const resolvedUser = currentUser ?? (await getUserWithRoles(userId));

  if (!resolvedUser) {
    throw new Error('Authentication required');
  }

  return resolvedUser;
}

export async function resolveMenteeAccessPolicy(
  userId: string,
  currentUser?: CurrentUser,
  policyConfig?: MenteePolicyConfig
): Promise<MenteeAccessPolicySnapshot> {
  const actor = await getMenteeAccessUser(userId, currentUser);
  const roleNames = new Set(
    actor.roles.map((role: { name: string }) => role.name)
  );
  const isMentee = roleNames.has('mentee');
  const isAdmin = roleNames.has('admin');
  const accountAccess = buildAccountAccessPolicySnapshot({
    isAuthenticated: true,
    isActive: actor.isActive,
    isBlocked: actor.isBlocked,
  });
  const subscription =
    isMentee || isAdmin
      ? await resolveSubscriptionEntitlements(userId, {
          audience: 'mentee',
          actorRole: 'mentee',
        })
      : null;

  return buildMenteeAccessPolicySnapshot({
    isMentee,
    isAdmin,
    accountAccess,
    subscription,
    policyConfig,
  });
}

export async function resolveMenteeFeatureAccess(
  userId: string,
  feature: MenteeFeatureKey,
  currentUser?: CurrentUser
): Promise<MenteeFeatureAccessDecision> {
  const policy = await resolveMenteeAccessPolicy(userId, currentUser);
  return policy.features[feature];
}

function getMenteeFeatureFailureMessage(
  feature: MenteeFeatureAccessDecision
): string {
  switch (feature.reasonCode) {
    case 'mentee_role_required':
      return 'Mentee access required';
    case 'authentication_required':
      return 'Authentication required';
    case 'account_inactive':
      return 'This account is inactive';
    case 'account_blocked':
      return 'This account is restricted';
    case 'account_state_unavailable':
      return 'Unable to verify account status';
    case 'subscription_required':
      return `${feature.label} requires an active mentee subscription.`;
    case 'feature_not_in_plan':
      return `${feature.label} is not included in the current mentee plan.`;
    case 'subscription_unavailable':
      return `Unable to verify subscription access for ${feature.label.toLowerCase()}.`;
    default:
      return `${feature.label} is unavailable.`;
  }
}

function getMenteeFeatureFailureStatus(
  feature: MenteeFeatureAccessDecision
): number {
  switch (feature.reasonCode) {
    case 'authentication_required':
      return 401;
    case 'account_state_unavailable':
      return 409;
    case 'account_inactive':
    case 'account_blocked':
      return 403;
    case 'subscription_unavailable':
      return 409;
    case 'mentee_role_required':
    case 'subscription_required':
    case 'feature_not_in_plan':
    default:
      return 403;
  }
}

export function getMenteeFeatureAccessFailure(
  feature: MenteeFeatureAccessDecision
): MenteeFeatureAccessFailure {
  return {
    status: getMenteeFeatureFailureStatus(feature),
    message: getMenteeFeatureFailureMessage(feature),
    reasonCode: feature.reasonCode,
    feature: feature.key,
  };
}

export function getMenteeFeatureDecisionFromPolicy(
  policy: MenteeAccessPolicySnapshot,
  feature: MenteeFeatureKey
): MenteeFeatureAccessDecision {
  return getMenteeFeatureDecision(policy, feature) ?? policy.features[feature];
}
