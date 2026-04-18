import {
  adminProcedure,
  createTRPCRouter,
  menteeFeatureProcedure,
  mentorFeatureProcedure,
} from '../init';
import {
  getAdminAnalytics,
  getMenteeLearningAnalytics,
  getMentorAnalytics,
} from '@/lib/analytics/server/service';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';
import { throwAsTRPCError } from '@/lib/trpc/router-error';
import {
  analyticsDateRangeInputSchema,
  menteeLearningAnalyticsInputSchema,
} from '@/lib/analytics/server/schemas';

export const analyticsRouter = createTRPCRouter({
  mentorDashboard: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.analyticsView)
    .input(analyticsDateRangeInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getMentorAnalytics(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentor analytics');
      }
    }),
  menteeLearning: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.analyticsView)
    .input(menteeLearningAnalyticsInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await getMenteeLearningAnalytics(ctx.userId, input, ctx.currentUser);
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
