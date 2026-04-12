import { z } from 'zod';

export const subscriptionAudienceSchema = z.enum(['mentor', 'mentee']);
export const subscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'incomplete',
  'expired',
]);
export const subscriptionPlanStatusSchema = z.enum([
  'draft',
  'active',
  'archived',
]);
export const subscriptionBillingIntervalSchema = z.enum([
  'day',
  'week',
  'month',
  'year',
]);
export const subscriptionFeatureValueTypeSchema = z.enum([
  'boolean',
  'count',
  'minutes',
  'text',
  'amount',
  'percent',
  'json',
]);

export const subscriptionScopeInputSchema = z.object({
  audience: subscriptionAudienceSchema.optional(),
});

export const selectSubscriptionPlanInputSchema = z.object({
  planId: z.string().uuid(),
  priceId: z.string().uuid().optional(),
  status: z.enum(['active', 'trialing']).optional(),
});

export const adminSubscriptionStatsInputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const adminSubscriptionAnalyticsInputSchema =
  adminSubscriptionStatsInputSchema.extend({
    audience: z.enum(['all', 'mentor', 'mentee']).optional(),
  });

export const adminSubscriptionListInputSchema = z.object({
  statuses: z.array(subscriptionStatusSchema).optional(),
  audience: z.enum(['all', 'mentor', 'mentee']).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const adminCreatePlanInputSchema = z.object({
  plan_key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Plan key must be lowercase with underscores'),
  audience: subscriptionAudienceSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  status: z.enum(['draft', 'active']),
});

export const adminUpdatePlanInputSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  status: subscriptionPlanStatusSchema.optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const adminDeletePlanInputSchema = z.object({
  planId: z.string().uuid(),
});

export const adminCreateFeatureInputSchema = z.object({
  feature_key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Feature key must be lowercase snake_case'),
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  value_type: subscriptionFeatureValueTypeSchema,
  unit: z.string().trim().nullable().optional(),
  is_metered: z.boolean(),
});

export const adminUpdateFeatureInputSchema = z.object({
  featureId: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  feature_key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Feature key must be lowercase snake_case')
    .optional(),
  description: z.string().trim().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  value_type: subscriptionFeatureValueTypeSchema.optional(),
  unit: z.string().trim().nullable().optional(),
  is_metered: z.boolean().optional(),
});

export const adminPlanIdInputSchema = z.object({
  planId: z.string().uuid(),
});

export const adminPlanFeatureUpsertInputSchema = z.object({
  planId: z.string().uuid(),
  feature_id: z.string().uuid(),
  is_included: z.boolean().optional(),
  limit_count: z.number().int().nullable().optional(),
  limit_minutes: z.number().int().nullable().optional(),
  limit_text: z.string().nullable().optional(),
  limit_amount: z.number().nullable().optional(),
  limit_currency: z.string().nullable().optional(),
  limit_percent: z.number().nullable().optional(),
  limit_json: z.record(z.unknown()).nullable().optional(),
  limit_interval: subscriptionBillingIntervalSchema.nullable().optional(),
  limit_interval_count: z.number().int().nullable().optional(),
});

export const adminCreatePlanPriceInputSchema = z.object({
  planId: z.string().uuid(),
  price_type: z.enum(['standard', 'introductory']),
  billing_interval: subscriptionBillingIntervalSchema,
  billing_interval_count: z.number().int().min(1),
  amount: z.number().min(0),
  currency: z.string().trim().min(1),
  is_active: z.boolean().optional(),
  effective_from: z.string().datetime().optional(),
  effective_to: z.string().datetime().optional(),
});

export const adminUpdatePlanPriceInputSchema = z.object({
  planId: z.string().uuid(),
  priceId: z.string().uuid(),
  price_type: z.enum(['standard', 'introductory']).optional(),
  billing_interval: subscriptionBillingIntervalSchema.optional(),
  billing_interval_count: z.number().int().min(1).optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().trim().min(1).optional(),
  is_active: z.boolean().optional(),
  effective_from: z.string().datetime().nullable().optional(),
  effective_to: z.string().datetime().nullable().optional(),
});

export type SubscriptionScopeInput = z.infer<
  typeof subscriptionScopeInputSchema
>;
export type SelectSubscriptionPlanInput = z.infer<
  typeof selectSubscriptionPlanInputSchema
>;
export type AdminSubscriptionStatsInput = z.infer<
  typeof adminSubscriptionStatsInputSchema
>;
export type AdminSubscriptionAnalyticsInput = z.infer<
  typeof adminSubscriptionAnalyticsInputSchema
>;
export type AdminSubscriptionListInput = z.infer<
  typeof adminSubscriptionListInputSchema
>;
export type AdminCreatePlanInput = z.infer<
  typeof adminCreatePlanInputSchema
>;
export type AdminUpdatePlanInput = z.infer<
  typeof adminUpdatePlanInputSchema
>;
export type AdminDeletePlanInput = z.infer<
  typeof adminDeletePlanInputSchema
>;
export type AdminCreateFeatureInput = z.infer<
  typeof adminCreateFeatureInputSchema
>;
export type AdminUpdateFeatureInput = z.infer<
  typeof adminUpdateFeatureInputSchema
>;
export type AdminPlanIdInput = z.infer<typeof adminPlanIdInputSchema>;
export type AdminPlanFeatureUpsertInput = z.infer<
  typeof adminPlanFeatureUpsertInputSchema
>;
export type AdminCreatePlanPriceInput = z.infer<
  typeof adminCreatePlanPriceInputSchema
>;
export type AdminUpdatePlanPriceInput = z.infer<
  typeof adminUpdatePlanPriceInputSchema
>;
