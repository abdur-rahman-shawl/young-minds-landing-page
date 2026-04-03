import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { adminProcedure, createTRPCRouter, protectedProcedure } from '../init';
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
import { BookingServiceError } from '@/lib/bookings/server/errors';
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
  selectAlternativeMentorInputSchema,
  updateBookingInputSchema,
  withdrawRescheduleRequestInputSchema,
} from '@/lib/bookings/server/schemas';
import { RateLimitError } from '@/lib/rate-limit';

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

  if (error instanceof BookingServiceError) {
    throw new TRPCError({
      code: mapStatusToTRPCCode(error.status),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof RateLimitError) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
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
