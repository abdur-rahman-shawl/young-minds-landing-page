import { z } from 'zod';

export const analyticsDateRangeInputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const menteeLearningAnalyticsInputSchema = z.object({
  timeRange: z.number().int().positive().max(365).optional(),
});

export type AnalyticsDateRangeInput = z.infer<
  typeof analyticsDateRangeInputSchema
>;
export type MenteeLearningAnalyticsInput = z.infer<
  typeof menteeLearningAnalyticsInputSchema
>;
