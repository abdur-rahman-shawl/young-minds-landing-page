import {
  adminProcedure,
  createTRPCRouter,
  menteeFeatureProcedure,
  mentorFeatureProcedure,
  protectedProcedure,
  userProcedure,
} from '../init';
import {
  acceptReassignment,
  cancelBooking,
  createBooking,
  createRescheduleRequest,
  getBooking,
  getSessionPolicies,
  listAlternativeMentors,
  listBookings,
  markBookingNoShow,
  rejectReassignment,
  respondToRescheduleRequest,
  selectAlternativeMentor,
  updateBooking,
  withdrawRescheduleRequest,
} from '@/lib/bookings/server/service';
import {
  getSessionView as getSessionViewFromRuntimeService,
  listMenteePendingReviews as listMenteePendingReviewsFromRuntimeService,
  listMentorPendingReviews as listMentorPendingReviewsFromRuntimeService,
} from '@/lib/bookings/server/runtime-service';
import {
  addAdminBookingNote as addAdminBookingNoteFromAdminService,
  adminCancelBooking as adminCancelBookingFromAdminService,
  adminClearNoShow as adminClearNoShowFromAdminService,
  adminCompleteBooking as adminCompleteBookingFromAdminService,
  adminReassignBooking as adminReassignBookingFromAdminService,
  adminRefundBooking as adminRefundBookingFromAdminService,
  getAdminBookingDetail as getAdminBookingDetailFromAdminService,
  getAdminSessionStats as getAdminSessionStatsFromAdminService,
  listAdminBookingNotes as listAdminBookingNotesFromAdminService,
  listAdminBookings as listAdminBookingsFromAdminService,
} from '@/lib/bookings/server/admin-service';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';
import {
  adminAddBookingNoteInputSchema,
  adminCancelBookingInputSchema,
  adminClearNoShowInputSchema,
  adminCompleteBookingInputSchema,
  adminGetBookingInputSchema,
  adminListBookingNotesInputSchema,
  adminListBookingsInputSchema,
  adminReassignBookingInputSchema,
  adminRefundBookingInputSchema,
  adminSessionStatsInputSchema,
  acceptReassignmentInputSchema,
  cancelBookingInputSchema,
  createBookingInputSchema,
  createRescheduleRequestInputSchema,
  getBookingInputSchema,
  getSessionPoliciesInputSchema,
  listAlternativeMentorsInputSchema,
  listBookingsInputSchema,
  markBookingNoShowInputSchema,
  rejectReassignmentInputSchema,
  respondRescheduleInputSchema,
  sessionViewInputSchema,
  selectAlternativeMentorInputSchema,
  updateBookingInputSchema,
  withdrawRescheduleRequestInputSchema,
} from '@/lib/bookings/server/schemas';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

export const bookingsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listBookingsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listBookings(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch bookings');
      }
    }),
  get: protectedProcedure
    .input(getBookingInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getBooking(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch booking');
      }
    }),
  sessionView: userProcedure
    .input(sessionViewInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getSessionViewFromRuntimeService(
          ctx.userId,
          input.sessionId,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch session details');
      }
    }),
  mentorPendingReviews: mentorFeatureProcedure(MENTOR_FEATURE_KEYS.reviewsManage).query(async ({ ctx }) => {
    try {
      return await listMentorPendingReviewsFromRuntimeService(
        ctx.userId,
        ctx.currentUser
      );
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentor review queue');
    }
  }),
  menteePendingReviews: menteeFeatureProcedure(MENTEE_FEATURE_KEYS.sessionsView).query(async ({ ctx }) => {
    try {
      return await listMenteePendingReviewsFromRuntimeService(
        ctx.userId,
        ctx.currentUser
      );
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentee review queue');
    }
  }),
  create: protectedProcedure
    .input(createBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createBooking(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create booking');
      }
    }),
  update: protectedProcedure
    .input(updateBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateBooking(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update booking');
      }
    }),
  getPolicies: protectedProcedure
    .input(getSessionPoliciesInputSchema)
    .query(async ({ input }) => {
      try {
        return await getSessionPolicies(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch session policies');
      }
    }),
  cancel: protectedProcedure
    .input(cancelBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelBooking(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to cancel booking');
      }
    }),
  createRescheduleRequest: protectedProcedure
    .input(createRescheduleRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createRescheduleRequest(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create reschedule request');
      }
    }),
  respondToRescheduleRequest: protectedProcedure
    .input(respondRescheduleInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await respondToRescheduleRequest(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to respond to reschedule request');
      }
    }),
  withdrawRescheduleRequest: protectedProcedure
    .input(withdrawRescheduleRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await withdrawRescheduleRequest(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to withdraw reschedule request');
      }
    }),
  markNoShow: protectedProcedure
    .input(markBookingNoShowInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await markBookingNoShow(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to mark session as no-show');
      }
    }),
  listAlternativeMentors: protectedProcedure
    .input(listAlternativeMentorsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listAlternativeMentors(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch alternative mentors');
      }
    }),
  acceptReassignment: protectedProcedure
    .input(acceptReassignmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await acceptReassignment(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to accept reassignment');
      }
    }),
  rejectReassignment: protectedProcedure
    .input(rejectReassignmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectReassignment(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to reject reassignment');
      }
    }),
  selectAlternativeMentor: protectedProcedure
    .input(selectAlternativeMentorInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await selectAlternativeMentor(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to select alternative mentor');
      }
    }),
  adminList: adminProcedure
    .input(adminListBookingsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listAdminBookingsFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch admin sessions');
      }
    }),
  adminStats: adminProcedure
    .input(adminSessionStatsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAdminSessionStatsFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch admin session stats');
      }
    }),
  adminGet: adminProcedure
    .input(adminGetBookingInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAdminBookingDetailFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch admin session details');
      }
    }),
  adminCancel: adminProcedure
    .input(adminCancelBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await adminCancelBookingFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to cancel admin session');
      }
    }),
  adminComplete: adminProcedure
    .input(adminCompleteBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await adminCompleteBookingFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to complete admin session');
      }
    }),
  adminRefund: adminProcedure
    .input(adminRefundBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await adminRefundBookingFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to refund admin session');
      }
    }),
  adminClearNoShow: adminProcedure
    .input(adminClearNoShowInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await adminClearNoShowFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to clear admin no-show');
      }
    }),
  adminReassign: adminProcedure
    .input(adminReassignBookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await adminReassignBookingFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to reassign admin session');
      }
    }),
  adminListNotes: adminProcedure
    .input(adminListBookingNotesInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listAdminBookingNotesFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch admin session notes');
      }
    }),
  adminAddNote: adminProcedure
    .input(adminAddBookingNoteInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addAdminBookingNoteFromAdminService(ctx as any, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to add admin session note');
      }
    }),
});
