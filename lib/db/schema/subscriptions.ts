import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================================================
// ENUMS
// ============================================================================

export const subscriptionPlanAudienceEnum = pgEnum('subscription_plan_audience', [
  'mentor',
  'mentee',
]);

export const subscriptionPlanStatusEnum = pgEnum('subscription_plan_status', [
  'draft',
  'active',
  'archived',
]);

export const subscriptionBillingIntervalEnum = pgEnum('subscription_billing_interval', [
  'month',
  'year',
]);

export const subscriptionPriceTypeEnum = pgEnum('subscription_price_type', [
  'standard',
  'introductory',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'incomplete',
  'expired',
]);

export const subscriptionFeatureValueTypeEnum = pgEnum('subscription_feature_value_type', [
  'boolean',
  'count',
  'minutes',
  'text',
  'amount',
  'percent',
  'json',
]);

// ============================================================================
// PLANS
// ============================================================================

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  planKey: text('plan_key').notNull().unique(), // e.g. mentor_silver, mentee_professional
  audience: subscriptionPlanAudienceEnum('audience').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: subscriptionPlanStatusEnum('status').default('draft').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  audienceIdx: index('subscription_plans_audience_idx').on(table.audience),
  statusIdx: index('subscription_plans_status_idx').on(table.status),
  sortOrderIdx: index('subscription_plans_sort_order_idx').on(table.sortOrder),
}));

export const subscriptionPlanPrices = pgTable('subscription_plan_prices', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id')
    .references(() => subscriptionPlans.id, { onDelete: 'cascade' })
    .notNull(),
  priceType: subscriptionPriceTypeEnum('price_type').default('standard').notNull(),
  billingInterval: subscriptionBillingIntervalEnum('billing_interval').notNull(),
  billingIntervalCount: integer('billing_interval_count').default(1).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  introDurationIntervals: integer('intro_duration_intervals'), // Number of intervals for intro pricing
  effectiveFrom: timestamp('effective_from'),
  effectiveTo: timestamp('effective_to'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  planIdIdx: index('subscription_plan_prices_plan_id_idx').on(table.planId),
  activeIdx: index('subscription_plan_prices_active_idx').on(table.isActive),
  priceTypeIdx: index('subscription_plan_prices_price_type_idx').on(table.priceType),
  intervalIdx: index('subscription_plan_prices_interval_idx').on(table.billingInterval),
}));

// ============================================================================
// FEATURES
// ============================================================================

export const subscriptionFeatures = pgTable('subscription_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  featureKey: text('feature_key').notNull().unique(), // e.g. ai_search_sessions
  name: text('name').notNull(),
  description: text('description'),
  valueType: subscriptionFeatureValueTypeEnum('value_type').default('boolean').notNull(),
  unit: text('unit'), // e.g. sessions, minutes, categories, calls
  isMetered: boolean('is_metered').default(false).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  valueTypeIdx: index('subscription_features_value_type_idx').on(table.valueType),
}));

export const subscriptionPlanFeatures = pgTable('subscription_plan_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id')
    .references(() => subscriptionPlans.id, { onDelete: 'cascade' })
    .notNull(),
  featureId: uuid('feature_id')
    .references(() => subscriptionFeatures.id, { onDelete: 'cascade' })
    .notNull(),
  isIncluded: boolean('is_included').default(true).notNull(),
  limitCount: integer('limit_count'),
  limitMinutes: integer('limit_minutes'),
  limitText: text('limit_text'),
  limitAmount: decimal('limit_amount', { precision: 12, scale: 2 }),
  limitCurrency: text('limit_currency'),
  limitPercent: integer('limit_percent'),
  limitJson: jsonb('limit_json'),
  limitInterval: subscriptionBillingIntervalEnum('limit_interval'),
  limitIntervalCount: integer('limit_interval_count').default(1),
  priceAmount: decimal('price_amount', { precision: 12, scale: 2 }),
  priceCurrency: text('price_currency'),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  planIdIdx: index('subscription_plan_features_plan_id_idx').on(table.planId),
  featureIdIdx: index('subscription_plan_features_feature_id_idx').on(table.featureId),
  uniquePlanFeatureIdx: uniqueIndex('subscription_plan_features_unique_idx').on(
    table.planId,
    table.featureId,
  ),
}));

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  planId: uuid('plan_id')
    .references(() => subscriptionPlans.id)
    .notNull(),
  priceId: uuid('price_id')
    .references(() => subscriptionPlanPrices.id, { onDelete: 'set null' }),
  status: subscriptionStatusEnum('status').default('trialing').notNull(),
  quantity: integer('quantity').default(1).notNull(), // seats for org/team plans
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialEnd: timestamp('trial_end'),
  cancelAt: timestamp('cancel_at'),
  canceledAt: timestamp('canceled_at'),
  endedAt: timestamp('ended_at'),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  provider: text('provider'), // e.g. stripe, razorpay
  providerCustomerId: text('provider_customer_id'),
  providerSubscriptionId: text('provider_subscription_id'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  planIdIdx: index('subscriptions_plan_id_idx').on(table.planId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
  providerSubscriptionIdx: index('subscriptions_provider_subscription_idx').on(table.providerSubscriptionId),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  prices: many(subscriptionPlanPrices),
  features: many(subscriptionPlanFeatures),
  subscriptions: many(subscriptions),
}));

export const subscriptionPlanPricesRelations = relations(subscriptionPlanPrices, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [subscriptionPlanPrices.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const subscriptionFeaturesRelations = relations(subscriptionFeatures, ({ many }) => ({
  plans: many(subscriptionPlanFeatures),
}));

export const subscriptionPlanFeaturesRelations = relations(subscriptionPlanFeatures, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [subscriptionPlanFeatures.planId],
    references: [subscriptionPlans.id],
  }),
  feature: one(subscriptionFeatures, {
    fields: [subscriptionPlanFeatures.featureId],
    references: [subscriptionFeatures.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  price: one(subscriptionPlanPrices, {
    fields: [subscriptions.priceId],
    references: [subscriptionPlanPrices.id],
  }),
}));

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SubscriptionPlanPrice = typeof subscriptionPlanPrices.$inferSelect;
export type NewSubscriptionPlanPrice = typeof subscriptionPlanPrices.$inferInsert;
export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
export type SubscriptionPlanFeature = typeof subscriptionPlanFeatures.$inferSelect;
export type NewSubscriptionPlanFeature = typeof subscriptionPlanFeatures.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
