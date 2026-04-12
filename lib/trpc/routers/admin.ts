import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { adminProcedure, createTRPCRouter } from '../init';
import {
  getAdminMentorAudit,
  getAdminOverview,
  getAdminPolicies,
  listAdminEnquiries,
  listAdminMentees,
  listAdminMentors,
  resetAdminPolicies,
  sendAdminMentorCoupon,
  updateAdminEnquiry,
  updateAdminMentor,
  updateAdminPolicies,
} from '@/lib/admin/server/service';
import { AdminServiceError } from '@/lib/admin/server/errors';
import {
  adminGetMentorAuditInputSchema,
  adminSendMentorCouponInputSchema,
  adminUpdateEnquiryInputSchema,
  adminUpdateMentorInputSchema,
  adminUpdatePoliciesInputSchema,
} from '@/lib/admin/server/schemas';

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

  if (error instanceof AdminServiceError) {
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

export const adminRouter = createTRPCRouter({
  overview: adminProcedure.query(async ({ ctx }) => {
    try {
      return await getAdminOverview(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch admin overview');
    }
  }),
  listMentors: adminProcedure.query(async ({ ctx }) => {
    try {
      return await listAdminMentors(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentors');
    }
  }),
  updateMentor: adminProcedure
    .input(adminUpdateMentorInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAdminMentor(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update mentor');
      }
    }),
  sendMentorCoupon: adminProcedure
    .input(adminSendMentorCouponInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendAdminMentorCoupon(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to send mentor coupon');
      }
    }),
  getMentorAudit: adminProcedure
    .input(adminGetMentorAuditInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAdminMentorAudit(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentor audit history');
      }
    }),
  listMentees: adminProcedure.query(async ({ ctx }) => {
    try {
      return await listAdminMentees(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch mentees');
    }
  }),
  listEnquiries: adminProcedure.query(async ({ ctx }) => {
    try {
      return await listAdminEnquiries(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch enquiries');
    }
  }),
  updateEnquiry: adminProcedure
    .input(adminUpdateEnquiryInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAdminEnquiry(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update enquiry');
      }
    }),
  getPolicies: adminProcedure.query(async ({ ctx }) => {
    try {
      return await getAdminPolicies(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch policies');
    }
  }),
  updatePolicies: adminProcedure
    .input(adminUpdatePoliciesInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAdminPolicies(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update policies');
      }
    }),
  resetPolicies: adminProcedure.mutation(async ({ ctx }) => {
    try {
      return await resetAdminPolicies(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to reset policies');
    }
  }),
});
