import { adminProcedure, createTRPCRouter } from '../init';
import {
  getAdminAccessPolicyConfig,
  publishAdminAccessPolicyDraft,
  resetAdminAccessPolicyDraft,
  upsertAdminAccessPolicyDraft,
} from '@/lib/access-policy/admin-service';
import {
  adminResetAccessPolicyDraftInputSchema,
  adminUpsertAccessPolicyDraftInputSchema,
} from '@/lib/access-policy/admin-schemas';
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
import {
  adminGetMentorAuditInputSchema,
  adminSendMentorCouponInputSchema,
  adminUpdateEnquiryInputSchema,
  adminUpdateMentorInputSchema,
  adminUpdatePoliciesInputSchema,
} from '@/lib/admin/server/schemas';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

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
  getAccessPolicyConfig: adminProcedure.query(async ({ ctx }) => {
    try {
      return await getAdminAccessPolicyConfig(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch access policy config');
    }
  }),
  upsertAccessPolicyDraft: adminProcedure
    .input(adminUpsertAccessPolicyDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertAdminAccessPolicyDraft(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update access policy draft');
      }
    }),
  publishAccessPolicyDraft: adminProcedure.mutation(async ({ ctx }) => {
    try {
      return await publishAdminAccessPolicyDraft(ctx as never);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to publish access policy draft');
    }
  }),
  resetAccessPolicyDraft: adminProcedure
    .input(adminResetAccessPolicyDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await resetAdminAccessPolicyDraft(ctx as never, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to reset access policy draft');
      }
    }),
});
