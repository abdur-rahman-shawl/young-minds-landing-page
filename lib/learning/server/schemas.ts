import { z } from 'zod';

export const learningCourseStatusSchema = z.enum([
  'ACTIVE',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
  'EXPIRED',
]);

export const learningCourseSortBySchema = z.enum([
  'enrolled_at',
  'progress',
  'last_accessed',
  'completed_at',
]);

export const learningSortOrderSchema = z.enum(['asc', 'desc']);

export const listEnrolledCoursesInputSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).optional(),
  status: learningCourseStatusSchema.optional(),
  sortBy: learningCourseSortBySchema.optional(),
  sortOrder: learningSortOrderSchema.optional(),
});

export const removeSavedItemInputSchema = z.object({
  courseId: z.string().uuid('Invalid course ID.'),
  itemId: z.string().uuid('Invalid item ID.'),
});

export const courseEnrollmentStatusInputSchema = z.object({
  courseId: z.string().uuid('Invalid course ID.'),
});

export const enrollCourseInputSchema = z.object({
  courseId: z.string().uuid('Invalid course ID.'),
  paymentMethodId: z.string().trim().min(1).optional(),
  isGift: z.boolean().optional(),
  giftFromUserId: z.string().trim().min(1).optional(),
  couponCode: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const courseProgressInputSchema = z.object({
  courseId: z.string().uuid('Invalid course ID.'),
});

export const courseProgressStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
]);

export const updateCourseProgressInputSchema = z.object({
  courseId: z.string().uuid('Invalid course ID.'),
  contentItemId: z.string().uuid('Invalid content item ID.'),
  status: courseProgressStatusSchema.optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  lastWatchedPosition: z.number().int().min(0).optional(),
  studentNotes: z.string().max(5000).optional(),
  isBookmarked: z.boolean().optional(),
  eventType: z.string().trim().max(100).optional(),
});

export const submitCourseReviewInputSchema = z
  .object({
    courseId: z.string().uuid('Invalid course ID.'),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(120).optional(),
    review: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => Boolean(data.title || data.review),
    { message: 'Review title or text is required.' }
  );

export const toggleCourseReviewHelpfulInputSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID.'),
});

export const submitContentItemReviewInputSchema = z
  .object({
    courseId: z.string().uuid('Invalid course ID.'),
    itemId: z.string().uuid('Invalid content item ID.'),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(120).optional(),
    review: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => Boolean(data.title || data.review),
    { message: 'Review title or text is required.' }
  );

export const reviewAudienceRoleSchema = z.enum(['mentor', 'mentee']);

export const listReviewQuestionsInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID.'),
  role: reviewAudienceRoleSchema,
});

export const submitSessionReviewInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID.'),
  feedback: z.string().trim().max(5000).optional(),
  ratings: z
    .array(
      z.object({
        questionId: z.string().uuid('Invalid question ID.'),
        rating: z
          .number()
          .int('Rating must be an integer.')
          .min(1, 'Rating must be between 1 and 5.')
          .max(5, 'Rating must be between 1 and 5.'),
      })
    )
    .min(1, 'At least one rating is required.'),
});

export type ListEnrolledCoursesInput = z.infer<
  typeof listEnrolledCoursesInputSchema
>;
export type RemoveSavedItemInput = z.infer<typeof removeSavedItemInputSchema>;
export type CourseEnrollmentStatusInput = z.infer<
  typeof courseEnrollmentStatusInputSchema
>;
export type EnrollCourseInput = z.infer<typeof enrollCourseInputSchema>;
export type CourseProgressInput = z.infer<typeof courseProgressInputSchema>;
export type UpdateCourseProgressInput = z.infer<
  typeof updateCourseProgressInputSchema
>;
export type SubmitCourseReviewInput = z.infer<
  typeof submitCourseReviewInputSchema
>;
export type ToggleCourseReviewHelpfulInput = z.infer<
  typeof toggleCourseReviewHelpfulInputSchema
>;
export type SubmitContentItemReviewInput = z.infer<
  typeof submitContentItemReviewInputSchema
>;
export type ListReviewQuestionsInput = z.infer<
  typeof listReviewQuestionsInputSchema
>;
export type SubmitSessionReviewInput = z.infer<
  typeof submitSessionReviewInputSchema
>;
