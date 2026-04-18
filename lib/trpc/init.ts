import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';

import {
  AccessPolicyError,
  assertMenteeFeatureAccess,
  assertMentorFeatureAccess,
  assertMessagingAccess,
  resolveCurrentUserCached,
} from '@/lib/access-policy/server';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { getErrorContract } from '@/lib/http/error-metadata';
import type {
  MenteeAccessPolicySnapshot,
  MenteeFeatureKey,
} from '@/lib/mentee/access-policy';
import type {
  MentorAccessPolicySnapshot,
  MentorFeatureKey,
} from '@/lib/mentor/access-policy';
import type {
  MessagingAccessDecision,
  MessagingAccessIntent,
  MessagingAudience,
} from '@/lib/messaging/access-policy';
import { mapStatusToTRPCCode } from '@/lib/trpc/router-error';

import type { TRPCContext } from './context';

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const contract = getErrorContract(error.cause);

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        httpStatus: contract.status ?? shape.data.httpStatus,
        reasonCode: contract.reasonCode,
        feature: contract.feature,
        intent: contract.intent,
        audience: contract.audience,
        source: contract.source,
        scope: contract.scope,
        errorData: contract.data,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;
type AuthenticatedContext = TRPCContext & {
  session: NonNullable<TRPCContext['session']>;
  userId: string;
};
type UserContext = AuthenticatedContext & {
  currentUser: CurrentUser;
  isAdmin: boolean;
  isMentor: boolean;
  isMentee: boolean;
};

function throwAccessPolicyTRPCError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof AccessPolicyError) {
    throw new TRPCError({
      code: mapStatusToTRPCCode(error.status),
      message: error.message,
      cause: error,
    });
  }

  throw error instanceof Error ? error : new Error('Unknown access policy error');
}

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      session: ctx.session,
    },
  });
});

export const userProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  try {
    const currentUser = await resolveCurrentUserCached(ctx.userId, {
      cache: ctx.accessPolicyCache,
      source: 'trpc.user',
    });
    const roleNames = new Set(
      currentUser.roles.map((role: { name: string }) => role.name)
    );

    return next({
      ctx: {
        ...ctx,
        currentUser,
        isAdmin: roleNames.has('admin'),
        isMentor: roleNames.has('mentor'),
        isMentee: roleNames.has('mentee'),
      },
    });
  } catch (error) {
    throwAccessPolicyTRPCError(error);
  }
});

export const adminProcedure = userProcedure.use(async ({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx,
  });
});

export const mentorProcedure = userProcedure.use(async ({ ctx, next }) => {
  if (!ctx.isMentor && !ctx.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mentor access required',
    });
  }

  return next({
    ctx,
  });
});

export const menteeProcedure = userProcedure.use(async ({ ctx, next }) => {
  if (!ctx.isMentee && !ctx.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mentee access required',
    });
  }

  return next({
    ctx,
  });
});

export function mentorFeatureProcedure(feature: MentorFeatureKey) {
  return userProcedure.use(async ({ ctx, next }) => {
    try {
      const result = await assertMentorFeatureAccess({
        userId: ctx.userId,
        feature,
        currentUser: ctx.currentUser,
        cache: ctx.accessPolicyCache,
        source: `trpc.mentor.${feature}`,
      });

      return next({
        ctx: {
          ...ctx,
          currentUser: result.currentUser,
          mentorAccessPolicy: result.policy,
          mentorFeatureAccess: result.access,
        },
      });
    } catch (error) {
      throwAccessPolicyTRPCError(error);
    }
  });
}

export function menteeFeatureProcedure(feature: MenteeFeatureKey) {
  return userProcedure.use(async ({ ctx, next }) => {
    try {
      const result = await assertMenteeFeatureAccess({
        userId: ctx.userId,
        feature,
        currentUser: ctx.currentUser,
        cache: ctx.accessPolicyCache,
        source: `trpc.mentee.${feature}`,
      });

      return next({
        ctx: {
          ...ctx,
          currentUser: result.currentUser,
          menteeAccessPolicy: result.policy,
          menteeFeatureAccess: result.access,
        },
      });
    } catch (error) {
      throwAccessPolicyTRPCError(error);
    }
  });
}

export function messagingIntentProcedure(
  intent: MessagingAccessIntent,
  options?: {
    audience?: MessagingAudience | null;
    preferredAudience?: Exclude<MessagingAudience, 'admin'> | null;
  }
) {
  return userProcedure.use(async ({ ctx, next }) => {
    try {
      const result = await assertMessagingAccess({
        userId: ctx.userId,
        intent,
        audience: options?.audience,
        preferredAudience: options?.preferredAudience,
        currentUser: ctx.currentUser,
        cache: ctx.accessPolicyCache,
        source: `trpc.messaging.${intent}`,
      });

      return next({
        ctx: {
          ...ctx,
          currentUser: result.currentUser,
          messagingAccess: result.access,
        },
      });
    } catch (error) {
      throwAccessPolicyTRPCError(error);
    }
  });
}

export const messagingMailboxProcedure = messagingIntentProcedure('mailbox');

export type ProtectedTRPCContext = AuthenticatedContext;

export type UserProcedureContext = UserContext;

export type PolicyAwareTRPCContext = UserContext & {
  mentorAccessPolicy?: MentorAccessPolicySnapshot;
  menteeAccessPolicy?: MenteeAccessPolicySnapshot;
  messagingAccess?: MessagingAccessDecision;
};

export type MentorFeatureProcedureContext = PolicyAwareTRPCContext & {
  mentorAccessPolicy: MentorAccessPolicySnapshot;
};

export type MenteeFeatureProcedureContext = PolicyAwareTRPCContext & {
  menteeAccessPolicy: MenteeAccessPolicySnapshot;
};

export type MessagingProcedureContext = PolicyAwareTRPCContext & {
  messagingAccess: MessagingAccessDecision;
};
