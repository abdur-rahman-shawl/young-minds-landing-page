import { getUserWithRoles } from '@/lib/db/user-helpers';
import {
  type MessagingAccessDecision,
  type MessagingAccessIntent,
  type MessagingAudience,
  getMessagingAccessDecision,
} from '@/lib/messaging/access-policy';
import {
  getMenteeFeatureAccessFailure,
  resolveMenteeAccessPolicy,
} from '@/lib/mentee/server/access-policy';
import {
  getMentorFeatureAccessFailure,
  resolveMentorAccessPolicy,
} from '@/lib/mentor/server/access-policy';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export interface MessagingAccessFailure {
  status: number;
  message: string;
  reasonCode: string;
}

async function getMessagingUser(
  userId: string,
  currentUser?: CurrentUser
): Promise<CurrentUser> {
  const resolvedUser = currentUser ?? (await getUserWithRoles(userId));

  if (!resolvedUser) {
    throw new Error('Authentication required');
  }

  return resolvedUser;
}

export async function resolveMessagingAccess(
  userId: string,
  intent: MessagingAccessIntent,
  options?: {
    audience?: MessagingAudience | null;
    preferredAudience?: Exclude<MessagingAudience, 'admin'> | null;
    currentUser?: CurrentUser;
  }
): Promise<MessagingAccessDecision> {
  const actor = await getMessagingUser(userId, options?.currentUser);
  const roleNames = new Set(
    actor.roles.map((role: { name: string }) => role.name)
  );
  const isAdmin = roleNames.has('admin');
  const hasMentorRole = roleNames.has('mentor');
  const hasMenteeRole = roleNames.has('mentee');

  const mentorAccess = hasMentorRole
    ? await resolveMentorAccessPolicy(userId, actor)
    : null;
  const menteeAccess = hasMenteeRole
    ? await resolveMenteeAccessPolicy(userId, actor)
    : null;

  return getMessagingAccessDecision(
    {
      isAdmin,
      mentorAccess,
      menteeAccess,
      preferredAudience: options?.preferredAudience ?? null,
    },
    intent,
    options?.audience
  );
}

export function getMessagingAccessFailure(
  decision: MessagingAccessDecision
): MessagingAccessFailure {
  if (decision.allowed) {
    return {
      status: 200,
      message: 'Messaging access granted',
      reasonCode: decision.reasonCode,
    };
  }

  if (decision.source?.audience === 'mentor') {
    const failure = getMentorFeatureAccessFailure(decision.source.feature);
    return {
      status: failure.status,
      message: failure.message,
      reasonCode: failure.reasonCode,
    };
  }

  if (decision.source?.audience === 'mentee') {
    const failure = getMenteeFeatureAccessFailure(decision.source.feature);
    return {
      status: failure.status,
      message: failure.message,
      reasonCode: failure.reasonCode,
    };
  }

  return {
    status: 403,
    message: 'Messaging access required',
    reasonCode: decision.reasonCode,
  };
}
