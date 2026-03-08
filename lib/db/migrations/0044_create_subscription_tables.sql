CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE subscription_billing_interval AS ENUM ('day', 'week', 'month', 'year');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_feature_value_type AS ENUM ('boolean', 'count', 'minutes', 'text', 'amount', 'percent', 'json');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan_audience AS ENUM ('mentor', 'mentee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_price_type AS ENUM ('standard', 'introductory');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_usage_event_type AS ENUM ('increment', 'decrement', 'reset');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_team_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_team_member_status AS ENUM ('invited', 'active', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS subscription_feature_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_feature_categories_category_key_uidx
ON subscription_feature_categories(category_key);

CREATE INDEX IF NOT EXISTS subscription_feature_categories_sort_order_idx
ON subscription_feature_categories(sort_order);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  audience subscription_plan_audience NOT NULL,
  name text NOT NULL,
  description text,
  status subscription_plan_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_plan_key_uidx
ON subscription_plans(plan_key);

CREATE INDEX IF NOT EXISTS subscription_plans_audience_sort_order_idx
ON subscription_plans(audience, sort_order);

CREATE INDEX IF NOT EXISTS subscription_plans_status_idx
ON subscription_plans(status);

CREATE TABLE IF NOT EXISTS subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  name text NOT NULL,
  description text,
  value_type subscription_feature_value_type NOT NULL,
  unit text,
  is_metered boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES subscription_feature_categories(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_features_feature_key_uidx
ON subscription_features(feature_key);

CREATE INDEX IF NOT EXISTS subscription_features_category_id_idx
ON subscription_features(category_id);

CREATE TABLE IF NOT EXISTS subscription_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
  is_included boolean NOT NULL DEFAULT false,
  limit_count integer,
  limit_minutes integer,
  limit_text text,
  limit_amount numeric(12, 2),
  limit_currency text,
  limit_percent numeric(8, 2),
  limit_json jsonb,
  limit_interval subscription_billing_interval,
  limit_interval_count integer NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plan_features_plan_id_feature_id_unique UNIQUE (plan_id, feature_id)
);

CREATE INDEX IF NOT EXISTS subscription_plan_features_plan_id_idx
ON subscription_plan_features(plan_id);

CREATE INDEX IF NOT EXISTS subscription_plan_features_feature_id_idx
ON subscription_plan_features(feature_id);

CREATE TABLE IF NOT EXISTS subscription_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  price_type subscription_price_type NOT NULL DEFAULT 'standard',
  billing_interval subscription_billing_interval NOT NULL,
  billing_interval_count integer NOT NULL DEFAULT 1,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp,
  effective_to timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_plan_prices_plan_id_idx
ON subscription_plan_prices(plan_id);

CREATE INDEX IF NOT EXISTS subscription_plan_prices_active_idx
ON subscription_plan_prices(is_active);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  price_id uuid REFERENCES subscription_plan_prices(id) ON DELETE SET NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  quantity integer NOT NULL DEFAULT 1,
  current_period_start timestamp,
  current_period_end timestamp,
  trial_end timestamp,
  cancel_at timestamp,
  canceled_at timestamp,
  ended_at timestamp,
  auto_renew boolean NOT NULL DEFAULT true,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx
ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS subscriptions_price_id_idx
ON subscriptions(price_id);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx
ON subscriptions(status);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS subscription_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
  usage_count integer NOT NULL DEFAULT 0,
  usage_minutes integer NOT NULL DEFAULT 0,
  usage_amount numeric(12, 2) NOT NULL DEFAULT 0,
  usage_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  interval_type subscription_billing_interval NOT NULL DEFAULT 'month',
  interval_count integer NOT NULL DEFAULT 1,
  limit_reached boolean NOT NULL DEFAULT false,
  limit_reached_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT subscription_usage_tracking_subscription_id_feature_id_period_unique
    UNIQUE (subscription_id, feature_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS subscription_usage_tracking_subscription_id_idx
ON subscription_usage_tracking(subscription_id);

CREATE INDEX IF NOT EXISTS subscription_usage_tracking_feature_id_idx
ON subscription_usage_tracking(feature_id);

CREATE TABLE IF NOT EXISTS subscription_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type subscription_usage_event_type NOT NULL DEFAULT 'increment',
  count_delta integer NOT NULL DEFAULT 0,
  minutes_delta integer NOT NULL DEFAULT 0,
  amount_delta numeric(12, 2) NOT NULL DEFAULT 0,
  resource_type text,
  resource_id text,
  limit_exceeded boolean NOT NULL DEFAULT false,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_usage_events_subscription_id_idx
ON subscription_usage_events(subscription_id);

CREATE INDEX IF NOT EXISTS subscription_usage_events_feature_id_idx
ON subscription_usage_events(feature_id);

CREATE INDEX IF NOT EXISTS subscription_usage_events_user_id_idx
ON subscription_usage_events(user_id);

CREATE INDEX IF NOT EXISTS subscription_usage_events_created_at_idx
ON subscription_usage_events(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_usage_events_idempotency_key_uidx
ON subscription_usage_events(idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscription_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role subscription_team_member_role NOT NULL DEFAULT 'member',
  invited_by text REFERENCES users(id) ON DELETE SET NULL,
  invited_at timestamp NOT NULL DEFAULT now(),
  joined_at timestamp,
  status subscription_team_member_status NOT NULL DEFAULT 'invited',
  removed_at timestamp,
  removed_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT subscription_team_members_subscription_id_user_id_unique UNIQUE (subscription_id, user_id)
);

CREATE INDEX IF NOT EXISTS subscription_team_members_subscription_id_idx
ON subscription_team_members(subscription_id);

CREATE INDEX IF NOT EXISTS subscription_team_members_user_id_idx
ON subscription_team_members(user_id);
