import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mentors } from '@/lib/db/schema';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { buildAccountAccessPolicySnapshot } from '@/lib/access-policy/account';
import {
  buildMentorAccessPolicySnapshot,
  getMentorFeatureDecision,
  type MentorPolicyConfig,
  type MentorAccessPolicySnapshot,
  type MentorAccessReasonCode,
  type MentorFeatureAccessDecision,
  type MentorFeatureKey,
} from '@/lib/mentor/access-policy';
import { resolveSubscriptionEntitlements } from '@/lib/subscriptions/entitlements';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export interface MentorFeatureAccessFailure {
  status: number;
  message: string;
  reasonCode: MentorAccessReasonCode;
  feature: MentorFeatureKey;
}

async function getMentorAccessUser(
  userId: string,
  currentUser?: CurrentUser
): Promise<CurrentUser> {
  const resolvedUser = currentUser ?? (await getUserWithRoles(userId));

  if (!resolvedUser) {
    throw new Error('Authentication required');
  }

  return resolvedUser;
}

async function getMentorAccessProfile(userId: string) {
  const [mentor] = await db
    .select({
      verificationStatus: mentors.verificationStatus,
      verificationNotes: mentors.verificationNotes,
      paymentStatus: mentors.paymentStatus,
    })
    .from(mentors)
    .where(eq(mentors.userId, userId))
    .limit(1);

  return mentor ?? null;
}

export async function resolveMentorAccessPolicy(
  userId: string,
  currentUser?: CurrentUser,
  policyConfig?: MentorPolicyConfig
): Promise<MentorAccessPolicySnapshot> {
  const actor = await getMentorAccessUser(userId, currentUser);
  const roleNames = new Set(
    actor.roles.map((role: { name: string }) => role.name)
  );
  const isMentor = roleNames.has('mentor');
  const isAdmin = roleNames.has('admin');
  const mentorProfile = isMentor ? await getMentorAccessProfile(userId) : null;
  const accountAccess = buildAccountAccessPolicySnapshot({
    isAuthenticated: true,
    isActive: actor.isActive,
    isBlocked: actor.isBlocked,
  });
  const subscription =
    isMentor || isAdmin
      ? await resolveSubscriptionEntitlements(userId, {
          audience: 'mentor',
          actorRole: 'mentor',
        })
      : null;

  return buildMentorAccessPolicySnapshot({
    isMentor,
    isAdmin,
    mentorProfile,
    accountAccess,
    subscription,
    policyConfig,
  });
}

export async function resolveMentorFeatureAccess(
  userId: string,
  feature: MentorFeatureKey,
  currentUser?: CurrentUser
): Promise<MentorFeatureAccessDecision> {
  const policy = await resolveMentorAccessPolicy(userId, currentUser);
  return policy.features[feature];
}

function getMentorFeatureFailureMessage(
  feature: MentorFeatureAccessDecision
): string {
  switch (feature.reasonCode) {
    case 'mentor_role_required':
      return 'Mentor access required';
    case 'authentication_required':
      return 'Authentication required';
    case 'account_inactive':
      return 'This account is inactive';
    case 'account_blocked':
      return 'This account is restricted';
    case 'account_state_unavailable':
      return 'Unable to verify account status';
    case 'application_required':
      return `Complete your mentor application before accessing ${feature.label.toLowerCase()}.`;
    case 'verification_pending':
      return `${feature.label} is unavailable until mentor verification is approved.`;
    case 'action_required':
      return `Update your mentor application before accessing ${feature.label.toLowerCase()}.`;
    case 'not_approved':
      return `Your mentor application must be updated before accessing ${feature.label.toLowerCase()}.`;
    case 'payment_required':
      return `${feature.label} is unavailable until mentor activation payment is completed.`;
    case 'subscription_required':
      return `${feature.label} requires an active mentor subscription.`;
    case 'feature_not_in_plan':
      return `${feature.label} is not included in the current mentor plan.`;
    case 'subscription_unavailable':
      return `Unable to verify subscription access for ${feature.label.toLowerCase()}.`;
    case 'status_unavailable':
      return `Unable to verify mentor access for ${feature.label.toLowerCase()}.`;
    default:
      return `${feature.label} is unavailable.`;
  }
}

function getMentorFeatureFailureStatus(
  feature: MentorFeatureAccessDecision
): number {
  switch (feature.reasonCode) {
    case 'authentication_required':
      return 401;
    case 'application_required':
    case 'account_state_unavailable':
    case 'subscription_unavailable':
    case 'status_unavailable':
      return 409;
    case 'account_inactive':
    case 'account_blocked':
    case 'mentor_role_required':
    case 'verification_pending':
    case 'action_required':
    case 'not_approved':
    case 'payment_required':
    case 'subscription_required':
    case 'feature_not_in_plan':
    default:
      return 403;
  }
}

export function getMentorFeatureAccessFailure(
  feature: MentorFeatureAccessDecision
): MentorFeatureAccessFailure {
  return {
    status: getMentorFeatureFailureStatus(feature),
    message: getMentorFeatureFailureMessage(feature),
    reasonCode: feature.reasonCode,
    feature: feature.key,
  };
}

export function getMentorFeatureDecisionFromPolicy(
  policy: MentorAccessPolicySnapshot,
  feature: MentorFeatureKey
): MentorFeatureAccessDecision {
  return getMentorFeatureDecision(policy, feature) ?? policy.features[feature];
}
