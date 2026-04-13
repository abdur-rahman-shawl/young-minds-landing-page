import { createTRPCRouter, menteeFeatureProcedure, protectedProcedure } from '../init';
import { RateLimitError, rateLimit } from '@/lib/rate-limit';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import {
  enrollInCourse,
  getCourseEnrollmentStatus,
  getCourseProgress,
  getReviewQuestions,
  listEnrolledCourses,
  listSavedItems,
  removeSavedItem,
  submitContentItemReview,
  submitCourseReview,
  submitSessionReview,
  toggleCourseReviewHelpfulVote,
  updateCourseProgress,
} from '@/lib/learning/server/service';
import { throwAsTRPCError } from '@/lib/trpc/router-error';
import {
  courseEnrollmentStatusInputSchema,
  courseProgressInputSchema,
  enrollCourseInputSchema,
  listEnrolledCoursesInputSchema,
  listReviewQuestionsInputSchema,
  removeSavedItemInputSchema,
  submitContentItemReviewInputSchema,
  submitCourseReviewInputSchema,
  submitSessionReviewInputSchema,
  toggleCourseReviewHelpfulInputSchema,
  updateCourseProgressInputSchema,
} from '@/lib/learning/server/schemas';

const savedItemsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

const learningReviewRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
});

function enforceSavedItemsRateLimit(request: Request, userId: string) {
  savedItemsRateLimit.check(request, `user:${userId}`);
}

function enforceLearningReviewRateLimit(request: Request, userId: string) {
  learningReviewRateLimit.check(request, `user:${userId}`);
}

export const learningRouter = createTRPCRouter({
  listCourses: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(listEnrolledCoursesInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listEnrolledCourses(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch enrolled courses');
      }
    }),
  courseEnrollment: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(courseEnrollmentStatusInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getCourseEnrollmentStatus(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch enrollment status');
      }
    }),
  enrollCourse: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(enrollCourseInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await enrollInCourse(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to enroll in course');
      }
    }),
  courseProgress: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(courseProgressInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getCourseProgress(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch course progress');
      }
    }),
  updateCourseProgress: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(updateCourseProgressInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCourseProgress(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update course progress');
      }
    }),
  listSavedItems: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace).query(async ({ ctx }) => {
    try {
      enforceSavedItemsRateLimit(ctx.req, ctx.userId);
      return await listSavedItems(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch saved items');
    }
  }),
  removeSavedItem: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(removeSavedItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceSavedItemsRateLimit(ctx.req, ctx.userId);
        return await removeSavedItem(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to remove saved item');
      }
    }),
  submitCourseReview: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(submitCourseReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceLearningReviewRateLimit(ctx.req, ctx.userId);
        return await submitCourseReview(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to submit course review');
      }
    }),
  toggleCourseReviewHelpful: protectedProcedure
    .input(toggleCourseReviewHelpfulInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleCourseReviewHelpfulVote(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update helpful vote');
      }
    }),
  submitContentItemReview: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.learningWorkspace)
    .input(submitContentItemReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceLearningReviewRateLimit(ctx.req, ctx.userId);
        return await submitContentItemReview(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to submit lesson review');
      }
    }),
  reviewQuestions: protectedProcedure
    .input(listReviewQuestionsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getReviewQuestions(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch review questions');
      }
    }),
  submitReview: protectedProcedure
    .input(submitSessionReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitSessionReview(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to submit review');
      }
    }),
});
