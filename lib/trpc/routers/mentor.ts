import { z } from 'zod';

import {
  createTRPCRouter,
  menteeFeatureProcedure,
  mentorFeatureProcedure,
  publicProcedure,
  userProcedure,
} from '../init';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';
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
import { throwAsTRPCError } from '@/lib/trpc/router-error';

export const mentorRouter = createTRPCRouter({
  list: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.mentorDirectoryView)
    .input(mentorListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listMentors(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentors');
      }
    }),
  get: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.mentorDirectoryView)
    .input(mentorDetailInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getMentorDetail(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentor details');
      }
    }),
  application: userProcedure.query(async ({ ctx }) => {
    try {
      return await getMentorApplication(ctx.userId);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor application');
    }
  }),
  updateProfile: userProcedure
    .input(mentorProfileUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateMentorProfile(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update mentor profile');
      }
    }),
  validateCoupon: userProcedure
    .input(mentorCouponInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await validateMentorCoupon(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to validate coupon code');
      }
    }),
  listSaved: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.mentorDirectoryView).query(async ({ ctx }) => {
    try {
      return await listSavedMentors(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch saved mentors');
    }
  }),
  save: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.mentorDirectoryView)
    .input(savedMentorInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveMentor(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save mentor');
      }
    }),
  unsave: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.mentorDirectoryView)
    .input(savedMentorInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unsaveMentor(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to remove saved mentor');
      }
    }),
  dashboardStats: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.dashboardStats).query(async ({ ctx }) => {
    try {
      return await getMentorDashboardRuntimeStats(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch dashboard statistics');
    }
  }),
  recentSessions: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.dashboardSessions)
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
  recentMessages: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.dashboardMessages)
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
  pendingReviews: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.reviewsManage).query(async ({ ctx }) => {
    try {
      return await listMentorPendingReviewsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch review queue');
    }
  }),
  mentees: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.menteesView)
    .input(mentorMenteesInputSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorMenteesRuntime(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentees');
      }
    }),
  menteeSessions: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.menteesView).query(async ({ ctx }) => {
    try {
      return await listMentorMenteeSessionsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentee session overview');
    }
  }),
  reviews: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.reviewsManage).query(async ({ ctx }) => {
    try {
      return await listMentorReviewsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor reviews');
    }
  }),
  courseComments: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.reviewsManage).query(async ({ ctx }) => {
    try {
      return await listMentorCourseCommentsRuntime(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor course comments');
    }
  }),
  replyToCourseComment: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.reviewsManage)
    .input(mentorCourseCommentReplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await replyToMentorCourseComment(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save mentor reply');
      }
    }),
  availability: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.availabilityManage)
    .input(mentorAvailabilityQueryInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getMentorAvailability(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch availability');
      }
    }),
  upsertAvailability: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.availabilityManage)
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
  availabilityExceptions: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.availabilityManage)
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
  createAvailabilityException: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.availabilityManage)
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
  deleteAvailabilityExceptions: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.availabilityManage)
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
  availableSlots: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.mentorDirectoryView)
    .input(mentorSlotsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMentorAvailableSlots(
          ctx.userId,
          input,
          ctx.currentUser
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
