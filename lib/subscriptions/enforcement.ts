/**
 * PRODUCTION-GRADE SUBSCRIPTION ENFORCEMENT UTILITIES
 *
 * This module provides secure, reliable subscription enforcement for the entire platform.
 * All functions fail loudly - no fallbacks, no silent failures.
 *
 * Usage:
 * - Call these functions before allowing access to features
 * - Track usage immediately after consumption
 * - Always handle the error cases explicitly
 */

import { createClient } from '@/lib/supabase/server';

export interface SubscriptionPlanFeature {
  feature_key: string;
  feature_name: string;
  is_included: boolean;
  value_type: 'boolean' | 'count' | 'minutes' | 'text' | 'amount' | 'percent' | 'json';
  unit?: string | null;

  // Limit values
  limit_count: number | null;
  limit_minutes: number | null;
  limit_text: string | null;
  limit_amount: number | null;
  limit_percent: number | null;
  limit_json: Record<string, any> | null;

  // Time-based limits
  limit_interval: 'day' | 'week' | 'month' | 'year' | null;
  limit_interval_count: number;

  // Metering
  is_metered: boolean;
}

export interface SubscriptionInfo {
  subscription_id: string;
  plan_id: string;
  plan_key: string;
  plan_name: string;
  audience: 'mentor' | 'mentee';
  status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'incomplete' | 'expired';
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface FeatureAccess {
  has_access: boolean;
  reason?: string;
  limit?: number | string | null;
  usage?: number;
  remaining?: number | string;
}

export interface UsageInfo {
  usage_count: number;
  usage_minutes: number;
  usage_amount: number;
  usage_json: Record<string, any>;
  period_start: string;
  period_end: string;
  limit_reached: boolean;
}

/**
 * Get the active subscription for a user
 * Throws if no active subscription found
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      subscription_plans!inner(
        id,
        plan_key,
        name,
        audience
      )
    `)
    .eq('user_id', userId)
    .in('status', ['trialing', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`No active subscription found for user ${userId}: ${error?.message || 'Not found'}`);
  }

  const plan = Array.isArray(data.subscription_plans)
    ? data.subscription_plans[0]
    : data.subscription_plans;

  return {
    subscription_id: data.id,
    plan_id: plan.id,
    plan_key: plan.plan_key,
    plan_name: plan.name,
    audience: plan.audience,
    status: data.status,
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
  };
}

/**
 * Get all features included in a user's subscription plan
 * Throws if subscription or features cannot be loaded
 */
export async function getPlanFeatures(userId: string): Promise<SubscriptionPlanFeature[]> {
  const subscription = await getUserSubscription(userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription_plan_features')
    .select(`
      *,
      subscription_features!inner(
        feature_key,
        name,
        value_type,
        is_metered,
        unit
      )
    `)
    .eq('plan_id', subscription.plan_id)
    .eq('is_included', true);

  if (error) {
    throw new Error(`Failed to load plan features: ${error.message}`);
  }

  return (data || []).map(item => {
    const feature = Array.isArray(item.subscription_features)
      ? item.subscription_features[0]
      : item.subscription_features;

    return {
      feature_key: feature.feature_key,
      feature_name: feature.name,
      is_included: item.is_included,
      value_type: feature.value_type,
      unit: feature.unit,
      limit_count: item.limit_count,
      limit_minutes: item.limit_minutes,
      limit_text: item.limit_text,
      limit_amount: item.limit_amount,
      limit_percent: item.limit_percent,
      limit_json: item.limit_json,
      limit_interval: item.limit_interval,
      limit_interval_count: item.limit_interval_count,
      is_metered: feature.is_metered,
    };
  });
}

/**
 * Check if user has access to a specific feature
 * Returns access status with detailed information
 *
 * For boolean features: returns has_access true/false
 * For metered features: returns has_access, usage, limit, remaining
 */
export async function checkFeatureAccess(
  userId: string,
  featureKey: string
): Promise<FeatureAccess> {
  try {
    const features = await getPlanFeatures(userId);
    const feature = features.find(f => f.feature_key === featureKey);

    if (!feature) {
      return {
        has_access: false,
        reason: `Feature '${featureKey}' not included in your plan`,
      };
    }

    // Boolean features - simple yes/no
    if (feature.value_type === 'boolean') {
      return {
        has_access: feature.is_included,
      };
    }

    // Text features - just return the limit text
    if (feature.value_type === 'text') {
      return {
        has_access: feature.is_included,
        limit: feature.limit_text,
      };
    }

    // Metered features - check usage against limits
    if (feature.is_metered) {
      const subscription = await getUserSubscription(userId);
      const usage = await getFeatureUsage(subscription.subscription_id, featureKey);

      // Count-based limits
      if (feature.value_type === 'count' && feature.limit_count !== null) {
        const remaining = feature.limit_count - usage.usage_count;
        return {
          has_access: remaining > 0,
          reason: remaining <= 0 ? 'Usage limit reached' : undefined,
          limit: feature.limit_count,
          usage: usage.usage_count,
          remaining: remaining,
        };
      }

      // Minutes-based limits
      if (feature.value_type === 'minutes' && feature.limit_minutes !== null) {
        const remaining = feature.limit_minutes - usage.usage_minutes;
        return {
          has_access: remaining > 0,
          reason: remaining <= 0 ? 'Time limit reached' : undefined,
          limit: feature.limit_minutes,
          usage: usage.usage_minutes,
          remaining: remaining,
        };
      }

      // Amount-based limits
      if (feature.value_type === 'amount' && feature.limit_amount !== null) {
        const remaining = Number(feature.limit_amount) - usage.usage_amount;
        return {
          has_access: remaining > 0,
          reason: remaining <= 0 ? 'Amount limit reached' : undefined,
          limit: feature.limit_amount,
          usage: usage.usage_amount,
          remaining: remaining,
        };
      }
    }

    // Non-metered features with limits - just return the limit info
    return {
      has_access: feature.is_included,
      limit: feature.limit_count || feature.limit_minutes || feature.limit_text,
    };

  } catch (error) {
    // Re-throw with context
    throw new Error(`Failed to check feature access for '${featureKey}': ${error}`);
  }
}

/**
 * Get current usage for a metered feature in the current billing period
 * Returns zero usage if no tracking record exists yet
 */
async function getFeatureUsage(
  subscriptionId: string,
  featureKey: string
): Promise<UsageInfo> {
  const supabase = await createClient();

  // Get feature ID
  const { data: featureData, error: featureError } = await supabase
    .from('subscription_features')
    .select('id')
    .eq('feature_key', featureKey)
    .single();

  if (featureError || !featureData) {
    throw new Error(`Feature '${featureKey}' not found: ${featureError?.message}`);
  }

  // Get current period usage
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('subscription_usage_tracking')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('feature_id', featureData.id)
    .lte('period_start', now)
    .gte('period_end', now)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is OK
    throw new Error(`Failed to load usage data: ${error.message}`);
  }

  if (!data) {
    // No usage tracking record yet - return zeros
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      usage_count: 0,
      usage_minutes: 0,
      usage_amount: 0,
      usage_json: {},
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      limit_reached: false,
    };
  }

  return {
    usage_count: data.usage_count,
    usage_minutes: data.usage_minutes,
    usage_amount: Number(data.usage_amount),
    usage_json: data.usage_json,
    period_start: data.period_start,
    period_end: data.period_end,
    limit_reached: data.limit_reached,
  };
}

/**
 * Track usage of a metered feature
 * Increments usage counters and logs the event
 * Throws if tracking fails - NEVER silently fails
 *
 * @param userId - User consuming the feature
 * @param featureKey - Feature being consumed
 * @param delta - Amount to increment (count, minutes, or amount)
 * @param resourceType - Type of resource (e.g., 'session', 'message', 'course')
 * @param resourceId - ID of the resource being consumed
 */
export async function trackFeatureUsage(
  userId: string,
  featureKey: string,
  delta: { count?: number; minutes?: number; amount?: number },
  resourceType?: string,
  resourceId?: string
): Promise<void> {
  const supabase = await createClient();

  try {
    // Get subscription
    const subscription = await getUserSubscription(userId);

    // Get feature
    const { data: featureData, error: featureError } = await supabase
      .from('subscription_features')
      .select('id, is_metered')
      .eq('feature_key', featureKey)
      .single();

    if (featureError || !featureData) {
      throw new Error(`Feature '${featureKey}' not found`);
    }

    if (!featureData.is_metered) {
      throw new Error(`Feature '${featureKey}' is not metered - cannot track usage`);
    }

    // Get or create usage tracking record for current period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: existingUsage } = await supabase
      .from('subscription_usage_tracking')
      .select('*')
      .eq('subscription_id', subscription.subscription_id)
      .eq('feature_id', featureData.id)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .single();

    if (existingUsage) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('subscription_usage_tracking')
        .update({
          usage_count: existingUsage.usage_count + (delta.count || 0),
          usage_minutes: existingUsage.usage_minutes + (delta.minutes || 0),
          usage_amount: Number(existingUsage.usage_amount) + (delta.amount || 0),
          updated_at: now.toISOString(),
        })
        .eq('id', existingUsage.id);

      if (updateError) {
        throw new Error(`Failed to update usage tracking: ${updateError.message}`);
      }
    } else {
      // Create new tracking record
      const { error: insertError } = await supabase
        .from('subscription_usage_tracking')
        .insert({
          subscription_id: subscription.subscription_id,
          feature_id: featureData.id,
          usage_count: delta.count || 0,
          usage_minutes: delta.minutes || 0,
          usage_amount: delta.amount || 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          interval_type: 'month',
          interval_count: 1,
        });

      if (insertError) {
        throw new Error(`Failed to create usage tracking: ${insertError.message}`);
      }
    }

    // Log usage event for audit trail
    await supabase
      .from('subscription_usage_events')
      .insert({
        subscription_id: subscription.subscription_id,
        feature_id: featureData.id,
        user_id: userId,
        event_type: 'increment',
        count_delta: delta.count || 0,
        minutes_delta: delta.minutes || 0,
        amount_delta: delta.amount || 0,
        resource_type: resourceType,
        resource_id: resourceId,
        limit_exceeded: false,
      });

  } catch (error) {
    throw new Error(`Failed to track feature usage: ${error}`);
  }
}

/**
 * Enforce feature access - check and track in one call
 * Use this when consuming a feature to ensure limits are enforced
 *
 * @returns FeatureAccess object
 * @throws Error if access check or tracking fails
 */
export async function enforceAndTrackFeature(
  userId: string,
  featureKey: string,
  delta: { count?: number; minutes?: number; amount?: number },
  resourceType?: string,
  resourceId?: string
): Promise<FeatureAccess> {
  // Check access first
  const access = await checkFeatureAccess(userId, featureKey);

  if (!access.has_access) {
    throw new Error(access.reason || `Access denied to feature '${featureKey}'`);
  }

  // Track usage
  await trackFeatureUsage(userId, featureKey, delta, resourceType, resourceId);

  // Return updated access info
  return access;
}
