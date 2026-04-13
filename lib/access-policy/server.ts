import { getUserWithRoles } from '@/lib/db/user-helpers';
import { AppHttpError } from '@/lib/http/app-error';
import {
  buildAccountAccessPolicySnapshot,
  getAccountAccessFailure,
} from '@/lib/access-policy/account';
import { resolveAccessPolicyRuntimeConfig } from '@/lib/access-policy/runtime-config';
import type { MenteeFeatureKey } from '@/lib/mentee/access-policy';
import type { MentorFeatureKey } from '@/lib/mentor/access-policy';
import {
  type MessagingAccessIntent,
  type MessagingAudience,
  getMessagingAccessDecision,
} from '@/lib/messaging/access-policy';
import { getMessagingAccessFailure } from '@/lib/messaging/server/access-policy';
import {
  getMenteeFeatureDecisionFromPolicy,
  resolveMenteeAccessPolicy,
} from '@/lib/mentee/server/access-policy';
import {
  getMentorFeatureDecisionFromPolicy,
  resolveMentorAccessPolicy,
} from '@/lib/mentor/server/access-policy';
import {
  getMenteeFeatureAccessFailure,
} from '@/lib/mentee/server/access-policy';
import {
  getMentorFeatureAccessFailure,
} from '@/lib/mentor/server/access-policy';

import type { AccessPolicyRequestCache } from './request-cache';
import { logAccessPolicyDenial } from './telemetry';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export class AccessPolicyError extends AppHttpError {
  constructor(
    status: number,
    message: string,
    data?: Record<string, unknown>
  ) {
    super(status, message, data);
    this.name = 'AccessPolicyError';
  }
}

export interface AccessPolicyAssertOptions {
  currentUser?: CurrentUser;
  cache?: AccessPolicyRequestCache;
  source?: string;
}

async function resolveCurrentUser(
  userId: string,
  options?: AccessPolicyAssertOptions
): Promise<CurrentUser> {
  if (options?.currentUser) {
    return options.currentUser;
  }

  const cache = options?.cache;
  const existing = cache?.currentUserById.get(userId);
  const pending =
    existing ??
    getUserWithRoles(userId).then((user) => user ?? null);

  if (!existing) {
    cache?.currentUserById.set(userId, pending);
  }

  const resolvedUser = await pending;

  if (!resolvedUser) {
    throw new AccessPolicyError(401, 'Authentication required', {
      reasonCode: 'authentication_required',
      userId,
    });
  }

  return resolvedUser;
}

export async function assertAccountAccess(options: {
  userId: string;
} & AccessPolicyAssertOptions) {
  const currentUser = await resolveCurrentUser(options.userId, options);
  const accountAccess = buildAccountAccessPolicySnapshot({
    isAuthenticated: true,
    isActive: currentUser.isActive,
    isBlocked: currentUser.isBlocked,
  });

  if (!accountAccess.allowed) {
    const failure = getAccountAccessFailure(accountAccess);
    raiseAccessPolicyDenial({
      scope: 'account',
      userId: options.userId,
      status: failure.status,
      message: failure.message,
      reasonCode: failure.reasonCode,
      source: options.source,
    });
  }

  return {
    currentUser,
    accountAccess,
  };
}

async function resolveMentorPolicy(
  userId: string,
  options?: AccessPolicyAssertOptions
) {
  const resolvedUser = await resolveCurrentUser(userId, options);
  const runtimeConfig = await resolveRuntimeConfig(options);
  const cache = options?.cache;
  const existing = cache?.mentorPolicyByUserId.get(userId);
  const pending =
    existing ??
    resolveMentorAccessPolicy(userId, resolvedUser, runtimeConfig.mentor);

  if (!existing) {
    cache?.mentorPolicyByUserId.set(userId, pending);
  }

  return {
    currentUser: resolvedUser,
    policy: await pending,
  };
}

async function resolveMenteePolicy(
  userId: string,
  options?: AccessPolicyAssertOptions
) {
  const resolvedUser = await resolveCurrentUser(userId, options);
  const runtimeConfig = await resolveRuntimeConfig(options);
  const cache = options?.cache;
  const existing = cache?.menteePolicyByUserId.get(userId);
  const pending =
    existing ??
    resolveMenteeAccessPolicy(userId, resolvedUser, runtimeConfig.mentee);

  if (!existing) {
    cache?.menteePolicyByUserId.set(userId, pending);
  }

  return {
    currentUser: resolvedUser,
    policy: await pending,
  };
}

function raiseAccessPolicyDenial(event: Parameters<typeof logAccessPolicyDenial>[0]) {
  logAccessPolicyDenial(event);
  throw new AccessPolicyError(event.status, event.message, {
    reasonCode: event.reasonCode,
    ...(event.feature ? { feature: event.feature } : {}),
    ...(event.intent ? { intent: event.intent } : {}),
    ...(event.audience !== undefined ? { audience: event.audience } : {}),
    ...(event.source ? { source: event.source } : {}),
    userId: event.userId,
    scope: event.scope,
  });
}

async function resolveRuntimeConfig(options?: AccessPolicyAssertOptions) {
  const cache = options?.cache;

  if (cache?.runtimeConfig) {
    return cache.runtimeConfig;
  }

  const pending = resolveAccessPolicyRuntimeConfig();

  if (cache) {
    cache.runtimeConfig = pending;
  }

  return pending;
}

export async function assertMentorFeatureAccess(options: {
  userId: string;
  feature: MentorFeatureKey;
} & AccessPolicyAssertOptions) {
  const { currentUser, policy } = await resolveMentorPolicy(
    options.userId,
    options
  );
  const access = getMentorFeatureDecisionFromPolicy(policy, options.feature);

  if (!access.allowed) {
    const failure = getMentorFeatureAccessFailure(access);
    raiseAccessPolicyDenial({
      scope: 'mentor_feature',
      userId: options.userId,
      status: failure.status,
      message: failure.message,
      reasonCode: failure.reasonCode,
      feature: failure.feature,
      source: options.source,
    });
  }

  return {
    currentUser,
    policy,
    access,
  };
}

export async function assertMenteeFeatureAccess(options: {
  userId: string;
  feature: MenteeFeatureKey;
} & AccessPolicyAssertOptions) {
  const { currentUser, policy } = await resolveMenteePolicy(
    options.userId,
    options
  );
  const access = getMenteeFeatureDecisionFromPolicy(policy, options.feature);

  if (!access.allowed) {
    const failure = getMenteeFeatureAccessFailure(access);
    raiseAccessPolicyDenial({
      scope: 'mentee_feature',
      userId: options.userId,
      status: failure.status,
      message: failure.message,
      reasonCode: failure.reasonCode,
      feature: failure.feature,
      source: options.source,
    });
  }

  return {
    currentUser,
    policy,
    access,
  };
}

function buildMessagingCacheKey(
  userId: string,
  intent: MessagingAccessIntent,
  audience?: MessagingAudience | null,
  preferredAudience?: Exclude<MessagingAudience, 'admin'> | null
) {
  return [userId, intent, audience ?? 'auto', preferredAudience ?? 'none'].join(':');
}

export async function assertMessagingAccess(options: {
  userId: string;
  intent: MessagingAccessIntent;
  audience?: MessagingAudience | null;
  preferredAudience?: Exclude<MessagingAudience, 'admin'> | null;
} & AccessPolicyAssertOptions) {
  const currentUser = await resolveCurrentUser(options.userId, options);
  const cacheKey = buildMessagingCacheKey(
    options.userId,
    options.intent,
    options.audience,
    options.preferredAudience
  );
  const existing = options.cache?.messagingDecisionByKey.get(cacheKey);
  const pending =
    existing ??
    (async () => {
      const roleNames = new Set(
        currentUser.roles.map((role: { name: string }) => role.name)
      );
      const mentorAccess = roleNames.has('mentor')
        ? (await resolveMentorPolicy(options.userId, {
            ...options,
            currentUser,
          })).policy
        : null;
      const menteeAccess = roleNames.has('mentee')
        ? (await resolveMenteePolicy(options.userId, {
            ...options,
            currentUser,
          })).policy
        : null;

      return getMessagingAccessDecision(
        {
          isAdmin: roleNames.has('admin'),
          mentorAccess,
          menteeAccess,
          preferredAudience: options.preferredAudience ?? null,
        },
        options.intent,
        options.audience
      );
    })();

  if (!existing) {
    options.cache?.messagingDecisionByKey.set(cacheKey, pending);
  }

  const access = await pending;

  if (!access.allowed) {
    const failure = getMessagingAccessFailure(access);
    raiseAccessPolicyDenial({
      scope: 'messaging',
      userId: options.userId,
      status: failure.status,
      message: failure.message,
      reasonCode: failure.reasonCode,
      intent: options.intent,
      audience: access.audience,
      source: options.source,
    });
  }

  return {
    currentUser,
    access,
  };
}

export async function resolveCurrentUserCached(
  userId: string,
  options?: AccessPolicyAssertOptions
) {
  return resolveCurrentUser(userId, options);
}
