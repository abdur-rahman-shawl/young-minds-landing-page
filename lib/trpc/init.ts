import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import type { TRPCContext } from './context';
import { getUserWithRoles } from '@/lib/db/user-helpers';

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
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

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const currentUser = await getUserWithRoles(ctx.userId);
  const isAdmin = currentUser?.roles.some((role) => role.name === 'admin');

  if (!currentUser || !isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      currentUser,
      isAdmin: true,
    },
  });
});

export const mentorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const currentUser = await getUserWithRoles(ctx.userId);
  const roleNames = new Set(currentUser?.roles.map((role) => role.name) ?? []);
  const isAdmin = roleNames.has('admin');
  const isMentor = roleNames.has('mentor');

  if (!currentUser || (!isMentor && !isAdmin)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mentor access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      currentUser,
      isAdmin,
      isMentor,
    },
  });
});
