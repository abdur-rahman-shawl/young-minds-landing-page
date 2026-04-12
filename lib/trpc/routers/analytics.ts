import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { adminProcedure, createTRPCRouter, mentorProcedure, protectedProcedure } from '../init';
import {
  AnalyticsServiceError,
  getAdminAnalytics,
  getMenteeLearningAnalytics,
  getMentorAnalytics,
} from '@/lib/analytics/server/service';
import {
  analyticsDateRangeInputSchema,
  menteeLearningAnalyticsInputSchema,
} from '@/lib/analytics/server/schemas';

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

  if (error instanceof AnalyticsServiceError) {
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

export const analyticsRouter = createTRPCRouter({
  mentorDashboard: mentorProcedure
    .input(analyticsDateRangeInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getMentorAnalytics(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentor analytics');
      }
    }),
  menteeLearning: protectedProcedure
    .input(menteeLearningAnalyticsInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getMenteeLearningAnalytics(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch learning analytics');
      }
    }),
  adminDashboard: adminProcedure
    .input(analyticsDateRangeInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getAdminAnalytics(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch admin analytics');
      }
    }),
});
