import { z } from 'zod';

export const mentorSearchModeSchema = z.enum(['AI_SEARCH', 'EXCLUSIVE_SEARCH']);

export const mentorListInputSchema = z.object({
  expertOnly: z.boolean().optional(),
  industry: z.string().trim().min(1).optional(),
  expertise: z.string().trim().min(1).optional(),
  availability: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  experience: z.number().int().min(0).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export const mentorDetailInputSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
});

export const mentorRecentListInputSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
});

export const mentorMenteesInputSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
  includeStats: z.boolean().default(false),
});

export const mentorCourseCommentReplyInputSchema = z.object({
  commentId: z.string().uuid('Invalid comment identifier'),
  feedbackType: z.enum(['course', 'content-item']),
  response: z.string().trim().min(1).max(2000),
});

export const savedMentorInputSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
});

export const availabilityTimeBlockSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']),
  maxBookings: z.number().int().min(1).optional(),
});

export const availabilityWeeklyPatternSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isEnabled: z.boolean(),
  timeBlocks: z.array(availabilityTimeBlockSchema),
});

export const mentorAvailabilityInputSchema = z.object({
  timezone: z.string().trim().min(1),
  defaultSessionDuration: z.number().int().min(15).max(240),
  bufferTimeBetweenSessions: z.number().int().min(0).max(60),
  minAdvanceBookingHours: z.number().int().min(0).max(168),
  maxAdvanceBookingDays: z.number().int().min(1).max(365),
  defaultStartTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  defaultEndTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  isActive: z.boolean(),
  allowInstantBooking: z.boolean(),
  requireConfirmation: z.boolean(),
  weeklyPatterns: z.array(availabilityWeeklyPatternSchema),
});

export const mentorAvailabilityQueryInputSchema = z.object({
  mentorUserId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const mentorAvailabilityExceptionInputSchema = z.object({
  mentorUserId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']).default('BLOCKED'),
  reason: z.string().trim().max(500).optional(),
  isFullDay: z.boolean().default(true),
  timeBlocks: z
    .array(
      z.object({
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']),
      })
    )
    .optional(),
});

export const deleteMentorAvailabilityExceptionsInputSchema = z.object({
  mentorUserId: z.string().min(1),
  exceptionIds: z.array(z.string().uuid()).min(1),
});

export const mentorSlotsInputSchema = z.object({
  mentorUserId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.number().int().min(15).max(240).optional(),
  timezone: z.string().trim().min(1).optional(),
});

export const mentorBookingEligibilityInputSchema = z.object({
  mentorUserId: z.string().min(1),
});

export const mentorProfileUpdateInputSchema = z.object({
  fullName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  title: z.string().trim().optional(),
  company: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  expertise: z.string().trim().optional(),
  experience: z.number().int().min(0).nullable().optional(),
  about: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional(),
  githubUrl: z.string().trim().optional(),
  websiteUrl: z.string().trim().optional(),
  hourlyRate: z.union([z.string().trim(), z.number()]).optional(),
  currency: z.string().trim().optional(),
  availability: z.string().trim().optional(),
  headline: z.string().trim().optional(),
  maxMentees: z.number().int().min(0).nullable().optional(),
  profileImageUrl: z.string().trim().nullable().optional(),
  bannerImageUrl: z.string().trim().nullable().optional(),
  resumeUrl: z.string().trim().nullable().optional(),
  isAvailable: z.boolean().optional(),
  searchMode: mentorSearchModeSchema.optional(),
});

export const mentorCouponInputSchema = z.object({
  couponCode: z.string().trim().min(1, 'Coupon code is required'),
});

export const mentorApplicationUpsertInputSchema = z.object({
  actorUserId: z.string().min(1),
  userId: z.string().min(1),
  fullName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  expertise: z.string().nullable().optional(),
  experience: z.number().int().min(0).nullable().optional(),
  hourlyRate: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  about: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  resumeUrl: z.string().nullable().optional(),
  rawFormSnapshot: z.record(z.string(), z.unknown()).default({}),
});

export type MentorProfileUpdateInput = z.infer<
  typeof mentorProfileUpdateInputSchema
>;
export type MentorCouponInput = z.infer<typeof mentorCouponInputSchema>;
export type MentorApplicationUpsertInput = z.infer<
  typeof mentorApplicationUpsertInputSchema
>;
export type MentorListInput = z.infer<typeof mentorListInputSchema>;
export type MentorDetailInput = z.infer<typeof mentorDetailInputSchema>;
export type MentorRecentListInput = z.infer<typeof mentorRecentListInputSchema>;
export type MentorMenteesInput = z.infer<typeof mentorMenteesInputSchema>;
export type MentorCourseCommentReplyInput = z.infer<
  typeof mentorCourseCommentReplyInputSchema
>;
export type SavedMentorInput = z.infer<typeof savedMentorInputSchema>;
export type MentorAvailabilityInput = z.infer<
  typeof mentorAvailabilityInputSchema
>;
export type MentorAvailabilityQueryInput = z.infer<
  typeof mentorAvailabilityQueryInputSchema
>;
export type MentorAvailabilityExceptionInput = z.infer<
  typeof mentorAvailabilityExceptionInputSchema
>;
export type DeleteMentorAvailabilityExceptionsInput = z.infer<
  typeof deleteMentorAvailabilityExceptionsInputSchema
>;
export type MentorSlotsInput = z.infer<typeof mentorSlotsInputSchema>;
export type MentorBookingEligibilityInput = z.infer<
  typeof mentorBookingEligibilityInputSchema
>;
