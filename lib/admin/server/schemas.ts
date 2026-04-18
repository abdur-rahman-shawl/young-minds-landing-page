import { z } from 'zod';

export const adminMentorStatusSchema = z.enum([
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'VERIFIED',
  'REJECTED',
  'REVERIFICATION',
  'RESUBMITTED',
  'UPDATED_PROFILE',
]);

export const adminUpdateMentorInputSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
  status: adminMentorStatusSchema,
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional(),
  enableCoupon: z.boolean().optional(),
  isExpert: z.boolean().optional(),
});

export const adminSendMentorCouponInputSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
});

export const adminGetMentorAuditInputSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
});

export const adminUpdateEnquiryInputSchema = z.object({
  enquiryId: z.string().uuid('Invalid enquiry identifier'),
  isResolved: z.boolean(),
});

export const adminPolicyUpdateItemSchema = z.object({
  key: z.string().trim().min(1, 'Policy key is required'),
  value: z.string(),
});

export const adminUpdatePoliciesInputSchema = z.object({
  updates: z
    .array(adminPolicyUpdateItemSchema)
    .min(1, 'Updates array is required'),
});

export type AdminMentorStatus = z.infer<typeof adminMentorStatusSchema>;
export type AdminUpdateMentorInput = z.infer<
  typeof adminUpdateMentorInputSchema
>;
export type AdminSendMentorCouponInput = z.infer<
  typeof adminSendMentorCouponInputSchema
>;
export type AdminGetMentorAuditInput = z.infer<
  typeof adminGetMentorAuditInputSchema
>;
export type AdminUpdateEnquiryInput = z.infer<
  typeof adminUpdateEnquiryInputSchema
>;
export type AdminUpdatePoliciesInput = z.infer<
  typeof adminUpdatePoliciesInputSchema
>;
