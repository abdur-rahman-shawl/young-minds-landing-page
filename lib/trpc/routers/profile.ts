import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../init';
import {
  getCurrentUserProfile,
  ProfileServiceError,
  upsertCurrentMenteeProfile,
} from '@/lib/profile/server/service';
import { upsertMenteeProfileInputSchema } from '@/lib/profile/server/schemas';

function mapStatusToTRPCCode(status: number): TRPCError['code'] {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function throwAsTRPCError(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof ProfileServiceError) {
    throw new TRPCError({
      code: mapStatusToTRPCCode(error.status),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof z.ZodError) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.errors[0]?.message ?? 'Invalid input',
      cause: error,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    cause: error instanceof Error ? error : undefined,
  });
}

export const profileRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getCurrentUserProfile(ctx.userId);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch user profile');
    }
  }),
  upsertMenteeProfile: protectedProcedure
    .input(upsertMenteeProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertCurrentMenteeProfile(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update mentee profile');
      }
    }),
});
