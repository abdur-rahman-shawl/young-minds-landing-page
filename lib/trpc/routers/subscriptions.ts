import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { adminProcedure, createTRPCRouter, protectedProcedure } from '../init';
import {
  createAdminSubscriptionFeature,
  createAdminSubscriptionPlan,
  createAdminSubscriptionPlanPrice,
  deleteAdminSubscriptionPlan,
  getAdminSubscriptionAnalytics,
  getAdminSubscriptionStats,
  getSelfSubscription,
  getSelfSubscriptionUsage,
  listAdminSubscriptionFeatureCategories,
  listAdminSubscriptionFeatures,
  listAdminSubscriptionPlanFeatures,
  listAdminSubscriptionPlanPrices,
  listAdminSubscriptionPlans,
  listAdminSubscriptions,
  selectSelfSubscriptionPlan,
  SubscriptionServiceError,
  updateAdminSubscriptionFeature,
  updateAdminSubscriptionPlan,
  updateAdminSubscriptionPlanPrice,
  upsertAdminSubscriptionPlanFeature,
} from '@/lib/subscriptions/server/service';
import {
  adminCreateFeatureInputSchema,
  adminCreatePlanInputSchema,
  adminCreatePlanPriceInputSchema,
  adminDeletePlanInputSchema,
  adminPlanFeatureUpsertInputSchema,
  adminPlanIdInputSchema,
  adminSubscriptionAnalyticsInputSchema,
  adminSubscriptionListInputSchema,
  adminSubscriptionStatsInputSchema,
  adminUpdateFeatureInputSchema,
  adminUpdatePlanInputSchema,
  adminUpdatePlanPriceInputSchema,
  selectSubscriptionPlanInputSchema,
  subscriptionScopeInputSchema,
} from '@/lib/subscriptions/server/schemas';

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

  if (error instanceof SubscriptionServiceError) {
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

export const subscriptionsRouter = createTRPCRouter({
  me: protectedProcedure
    .input(subscriptionScopeInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getSelfSubscription(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to load subscription details');
      }
    }),
  usage: protectedProcedure
    .input(subscriptionScopeInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getSelfSubscriptionUsage(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to load subscription usage');
      }
    }),
  selectPlan: protectedProcedure
    .input(selectSubscriptionPlanInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await selectSelfSubscriptionPlan(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to select plan');
      }
    }),
  adminStats: adminProcedure
    .input(adminSubscriptionStatsInputSchema.optional())
    .query(async ({ input }) => {
      try {
        return await getAdminSubscriptionStats(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch subscription stats');
      }
    }),
  adminListPlans: adminProcedure.query(async () => {
    try {
      return await listAdminSubscriptionPlans();
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch plans');
    }
  }),
  adminCreatePlan: adminProcedure
    .input(adminCreatePlanInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await createAdminSubscriptionPlan(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create plan');
      }
    }),
  adminUpdatePlan: adminProcedure
    .input(adminUpdatePlanInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await updateAdminSubscriptionPlan(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update plan');
      }
    }),
  adminDeletePlan: adminProcedure
    .input(adminDeletePlanInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await deleteAdminSubscriptionPlan(input.planId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete plan');
      }
    }),
  adminListFeatures: adminProcedure.query(async () => {
    try {
      return await listAdminSubscriptionFeatures();
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch features');
    }
  }),
  adminListFeatureCategories: adminProcedure.query(async () => {
    try {
      return await listAdminSubscriptionFeatureCategories();
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch feature categories');
    }
  }),
  adminCreateFeature: adminProcedure
    .input(adminCreateFeatureInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await createAdminSubscriptionFeature(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create feature');
      }
    }),
  adminUpdateFeature: adminProcedure
    .input(adminUpdateFeatureInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await updateAdminSubscriptionFeature(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update feature');
      }
    }),
  adminListPlanFeatures: adminProcedure
    .input(adminPlanIdInputSchema)
    .query(async ({ input }) => {
      try {
        return await listAdminSubscriptionPlanFeatures(input.planId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to load plan features');
      }
    }),
  adminUpsertPlanFeature: adminProcedure
    .input(adminPlanFeatureUpsertInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await upsertAdminSubscriptionPlanFeature(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save plan feature');
      }
    }),
  adminListPlanPrices: adminProcedure
    .input(adminPlanIdInputSchema)
    .query(async ({ input }) => {
      try {
        return await listAdminSubscriptionPlanPrices(input.planId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch plan prices');
      }
    }),
  adminCreatePlanPrice: adminProcedure
    .input(adminCreatePlanPriceInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await createAdminSubscriptionPlanPrice(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create plan price');
      }
    }),
  adminUpdatePlanPrice: adminProcedure
    .input(adminUpdatePlanPriceInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await updateAdminSubscriptionPlanPrice(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update plan price');
      }
    }),
  adminListSubscriptions: adminProcedure
    .input(adminSubscriptionListInputSchema)
    .query(async ({ input }) => {
      try {
        return await listAdminSubscriptions(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch subscriptions');
      }
    }),
  adminAnalytics: adminProcedure
    .input(adminSubscriptionAnalyticsInputSchema.optional())
    .query(async ({ input }) => {
      try {
        return await getAdminSubscriptionAnalytics(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to load usage analytics');
      }
    }),
});
