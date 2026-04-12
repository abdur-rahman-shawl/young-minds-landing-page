import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, mentorProcedure, protectedProcedure, publicProcedure } from '../init';
import { MentorLifecycleServiceError } from '@/lib/mentor/server/errors';
import {
  getMentorApplication,
  updateMentorProfile,
  validateMentorCoupon,
} from '@/lib/mentor/server/service';
import {
  createMentorAvailabilityException,
  deleteMentorAvailabilityExceptions,
  getMentorAvailability,
  getMentorBookingEligibility,
  listMentorAvailabilityExceptions,
  listMentorAvailableSlots,
  upsertMentorAvailability,
} from '@/lib/mentor/server/availability-service';
import {
  getMentorDashboardRuntimeStats,
  getMentorDetail,
  listMentorCourseCommentsRuntime,
  listMentorMenteeSessionsRuntime,
  listMentorMenteesRuntime,
  listMentorPendingReviewsRuntime,
  listMentorRecentMessagesRuntime,
  listMentorRecentSessionsRuntime,
  listMentorReviewsRuntime,
  listMentors,
  listSavedMentors,
  replyToMentorCourseComment,
  saveMentor,
  unsaveMentor,
} from '@/lib/mentor/server/runtime-service';
import {
  deleteMentorAvailabilityExceptionsInputSchema,
  mentorAvailabilityExceptionInputSchema,
  mentorAvailabilityInputSchema,
  mentorAvailabilityQueryInputSchema,
  mentorBookingEligibilityInputSchema,
  mentorCourseCommentReplyInputSchema,
  mentorDetailInputSchema,
  mentorListInputSchema,
  mentorMenteesInputSchema,
  mentorRecentListInputSchema,
  mentorCouponInputSchema,
  mentorProfileUpdateInputSchema,
  mentorSlotsInputSchema,
  savedMentorInputSchema,
} from '@/lib/mentor/server/schemas';

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

  if (error instanceof MentorLifecycleServiceError) {
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

export const mentorRouter = createTRPCRouter({
  list: protectedProcedure
    .input(mentorListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listMentors(ctx.userId, input, (ctx as any).currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentors');
      }
    }),
  get: protectedProcedure
    .input(mentorDetailInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getMentorDetail(ctx.userId, input, (ctx as any).currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentor details');
      }
    }),
  application: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getMentorApplication(ctx.userId);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor application');
    }
  }),
  updateProfile: protectedProcedure
    .input(mentorProfileUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateMentorProfile(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update mentor profile');
      }
    }),
  validateCoupon: protectedProcedure
    .input(mentorCouponInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await validateMentorCoupon(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to validate coupon code');
      }
    }),
  listSaved: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listSavedMentors(ctx.userId, (ctx as any).currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch saved mentors');
    }
  }),
  save: protectedProcedure
    .input(savedMentorInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveMentor(ctx.userId, input, (ctx as any).currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save mentor');
      }
    }),
  unsave: protectedProcedure
    .input(savedMentorInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unsaveMentor(ctx.userId, input, (ctx as any).currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to remove saved mentor');
      }
    }),
  dashboardStats: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await getMentorDashboardRuntimeStats(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch dashboard statistics');
    }
  }),
  recentSessions: mentorProcedure
    .input(mentorRecentListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorRecentSessionsRuntime(
          ctx.userId,
          input,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch recent sessions');
      }
    }),
  recentMessages: mentorProcedure
    .input(mentorRecentListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorRecentMessagesRuntime(
          ctx.userId,
          input,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch recent messages');
      }
    }),
  pendingReviews: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await listMentorPendingReviewsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch review queue');
    }
  }),
  mentees: mentorProcedure
    .input(mentorMenteesInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorMenteesRuntime(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentees');
      }
    }),
  menteeSessions: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await listMentorMenteeSessionsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentee session overview');
    }
  }),
  reviews: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await listMentorReviewsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor reviews');
    }
  }),
  courseComments: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await listMentorCourseCommentsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor course comments');
    }
  }),
  replyToCourseComment: mentorProcedure
    .input(mentorCourseCommentReplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await replyToMentorCourseComment(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save mentor reply');
      }
    }),
  availability: mentorProcedure
    .input(mentorAvailabilityQueryInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getMentorAvailability(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch availability');
      }
    }),
  upsertAvailability: mentorProcedure
    .input(
      z.object({
        mentorUserId: z.string().min(1),
        schedule: mentorAvailabilityInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertMentorAvailability(
          ctx.userId,
          input.mentorUserId,
          input.schedule,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save availability');
      }
    }),
  availabilityExceptions: mentorProcedure
    .input(mentorAvailabilityQueryInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorAvailabilityExceptions(
          ctx.userId,
          input,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch availability exceptions');
      }
    }),
  createAvailabilityException: mentorProcedure
    .input(mentorAvailabilityExceptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createMentorAvailabilityException(
          ctx.userId,
          input,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create availability exception');
      }
    }),
  deleteAvailabilityExceptions: mentorProcedure
    .input(deleteMentorAvailabilityExceptionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteMentorAvailabilityExceptions(
          ctx.userId,
          input,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete availability exceptions');
      }
    }),
  availableSlots: protectedProcedure
    .input(mentorSlotsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorAvailableSlots(
          ctx.userId,
          input,
          (ctx as any).currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch available slots');
      }
    }),
  bookingEligibility: publicProcedure
    .input(mentorBookingEligibilityInputSchema)
    .query(async ({ input }) => {
      try {
        return await getMentorBookingEligibility(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch booking eligibility');
      }
    }),
});
