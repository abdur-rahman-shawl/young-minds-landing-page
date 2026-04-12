import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../init';
import { RateLimitError, rateLimit } from '@/lib/rate-limit';
import {
  LearningServiceError,
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
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function throwAsTRPCError(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof RateLimitError) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof LearningServiceError) {
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

function enforceSavedItemsRateLimit(request: Request, userId: string) {
  savedItemsRateLimit.check(request, `user:${userId}`);
}

function enforceLearningReviewRateLimit(request: Request, userId: string) {
  learningReviewRateLimit.check(request, `user:${userId}`);
}

export const learningRouter = createTRPCRouter({
  listCourses: protectedProcedure
    .input(listEnrolledCoursesInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listEnrolledCourses(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch enrolled courses');
      }
    }),
  courseEnrollment: protectedProcedure
    .input(courseEnrollmentStatusInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getCourseEnrollmentStatus(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch enrollment status');
      }
    }),
  enrollCourse: protectedProcedure
    .input(enrollCourseInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await enrollInCourse(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to enroll in course');
      }
    }),
  courseProgress: protectedProcedure
    .input(courseProgressInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getCourseProgress(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch course progress');
      }
    }),
  updateCourseProgress: protectedProcedure
    .input(updateCourseProgressInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCourseProgress(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update course progress');
      }
    }),
  listSavedItems: protectedProcedure.query(async ({ ctx }) => {
    try {
      enforceSavedItemsRateLimit(ctx.req, ctx.userId);
      return await listSavedItems(ctx.userId);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch saved items');
    }
  }),
  removeSavedItem: protectedProcedure
    .input(removeSavedItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceSavedItemsRateLimit(ctx.req, ctx.userId);
        return await removeSavedItem(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to remove saved item');
      }
    }),
  submitCourseReview: protectedProcedure
    .input(submitCourseReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceLearningReviewRateLimit(ctx.req, ctx.userId);
        return await submitCourseReview(ctx.userId, input);
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
  submitContentItemReview: protectedProcedure
    .input(submitContentItemReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceLearningReviewRateLimit(ctx.req, ctx.userId);
        return await submitContentItemReview(ctx.userId, input);
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
