CREATE TYPE "subscription_plan_audience" AS ENUM ('mentor', 'mentee');
CREATE TYPE "subscription_plan_status" AS ENUM ('draft', 'active', 'archived');
CREATE TYPE "subscription_billing_interval" AS ENUM ('month', 'year');
CREATE TYPE "subscription_price_type" AS ENUM ('standard', 'introductory');
CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete', 'expired');
CREATE TYPE "subscription_feature_value_type" AS ENUM ('boolean', 'count', 'minutes', 'text', 'amount', 'percent', 'json');

CREATE TABLE "subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_key" text NOT NULL,
  "audience" "subscription_plan_audience" NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" "subscription_plan_status" DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plans_plan_key_unique" UNIQUE("plan_key")
);

CREATE TABLE "subscription_plan_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL,
  "price_type" "subscription_price_type" DEFAULT 'standard' NOT NULL,
  "billing_interval" "subscription_billing_interval" NOT NULL,
  "billing_interval_count" integer DEFAULT 1 NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "currency" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "intro_duration_intervals" integer,
  "effective_from" timestamp,
  "effective_to" timestamp,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plan_prices_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "subscription_features" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "feature_key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "value_type" "subscription_feature_value_type" DEFAULT 'boolean' NOT NULL,
  "unit" text,
  "is_metered" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_features_feature_key_unique" UNIQUE("feature_key")
);

CREATE TABLE "subscription_plan_features" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "is_included" boolean DEFAULT true NOT NULL,
  "limit_count" integer,
  "limit_minutes" integer,
  "limit_text" text,
  "limit_amount" numeric(12, 2),
  "limit_currency" text,
  "limit_percent" integer,
  "limit_json" jsonb,
  "limit_interval" "subscription_billing_interval",
  "limit_interval_count" integer DEFAULT 1,
  "price_amount" numeric(12, 2),
  "price_currency" text,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plan_features_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "subscription_plan_features_feature_id_subscription_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."subscription_features"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "plan_id" uuid NOT NULL,
  "price_id" uuid,
  "status" "subscription_status" DEFAULT 'trialing' NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "trial_end" timestamp,
  "cancel_at" timestamp,
  "canceled_at" timestamp,
  "ended_at" timestamp,
  "auto_renew" boolean DEFAULT true NOT NULL,
  "provider" text,
  "provider_customer_id" text,
  "provider_subscription_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "subscriptions_price_id_subscription_plan_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."subscription_plan_prices"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX "subscription_plans_audience_idx" ON "subscription_plans" ("audience");
CREATE INDEX "subscription_plans_status_idx" ON "subscription_plans" ("status");
CREATE INDEX "subscription_plans_sort_order_idx" ON "subscription_plans" ("sort_order");

CREATE INDEX "subscription_plan_prices_plan_id_idx" ON "subscription_plan_prices" ("plan_id");
CREATE INDEX "subscription_plan_prices_active_idx" ON "subscription_plan_prices" ("is_active");
CREATE INDEX "subscription_plan_prices_price_type_idx" ON "subscription_plan_prices" ("price_type");
CREATE INDEX "subscription_plan_prices_interval_idx" ON "subscription_plan_prices" ("billing_interval");

CREATE INDEX "subscription_features_value_type_idx" ON "subscription_features" ("value_type");

CREATE INDEX "subscription_plan_features_plan_id_idx" ON "subscription_plan_features" ("plan_id");
CREATE INDEX "subscription_plan_features_feature_id_idx" ON "subscription_plan_features" ("feature_id");
CREATE UNIQUE INDEX "subscription_plan_features_unique_idx" ON "subscription_plan_features" ("plan_id","feature_id");

CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions" ("plan_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" ("status");
CREATE INDEX "subscriptions_provider_subscription_idx" ON "subscriptions" ("provider_subscription_id");
