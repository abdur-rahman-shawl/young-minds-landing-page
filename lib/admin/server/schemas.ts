import { z } from 'zod';
import { passwordValidation } from '@/lib/validations/auth';

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

export const adminCreateMentorUserInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(160, 'Full name must be 160 characters or fewer'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .transform((value) => value.toLowerCase()),
  initialPassword: passwordValidation,
  phone: z
    .string()
    .trim()
    .max(40, 'Phone number must be 40 characters or fewer')
    .optional(),
  title: z
    .string()
    .trim()
    .max(160, 'Title must be 160 characters or fewer')
    .optional(),
  company: z
    .string()
    .trim()
    .max(160, 'Company must be 160 characters or fewer')
    .optional(),
  industry: z
    .string()
    .trim()
    .max(160, 'Industry must be 160 characters or fewer')
    .optional(),
  expertise: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Expertise items cannot be empty')
        .max(120, 'Expertise items must be 120 characters or fewer')
    )
    .max(20, 'You can add up to 20 expertise items')
    .optional(),
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
export type AdminCreateMentorUserInput = z.infer<
  typeof adminCreateMentorUserInputSchema
>;
