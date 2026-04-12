'use client';

import { useQuery } from '@tanstack/react-query';

import type { FeatureKey } from '@/lib/subscriptions/feature-keys';
import {
  hasIncludedFeature,
  type SubscriptionFeatureRecord,
} from '@/lib/subscriptions/client-access';

export type SubscriptionAudience = 'mentor' | 'mentee';

export interface SubscriptionInfo {
  subscription_id?: string;
  plan_id: string;
  plan_name: string;
  status: string;
  audience: SubscriptionAudience;
  current_period_end: string | null;
}

export interface SubscriptionFeature extends SubscriptionFeatureRecord {
  feature_name: string;
  value_type:
    | 'boolean'
    | 'count'
    | 'minutes'
    | 'text'
    | 'amount'
    | 'percent'
    | 'json';
  limit_count: number | null;
  limit_minutes: number | null;
  limit_text: string | null;
  limit_amount: number | string | null;
  limit_percent: number | null;
  limit_json: Record<string, unknown> | null;
  limit_interval: 'day' | 'week' | 'month' | 'year' | null;
  limit_interval_count: number | null;
  is_metered: boolean;
  unit?: string | null;
}

interface SubscriptionResponse {
  success: boolean;
  data?: {
    subscription: SubscriptionInfo | null;
    features: SubscriptionFeature[];
  };
  message?: string;
  error?: string;
}

export const subscriptionKeys = {
  all: ['subscription'] as const,
  me: (audience: SubscriptionAudience) =>
    [...subscriptionKeys.all, 'me', audience] as const,
};

async function fetchSubscriptionDetails(audience: SubscriptionAudience) {
  const response = await fetch(`/api/subscriptions/me?audience=${audience}`, {
    credentials: 'include',
  });

  const payload = (await response.json()) as SubscriptionResponse;

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.message || payload.error || 'Failed to load subscription details'
    );
  }

  return {
    subscription: payload.data?.subscription ?? null,
    features: payload.data?.features ?? [],
  };
}

export function useSubscriptionDetails(
  audience: SubscriptionAudience,
  enabled = true
) {
  return useQuery({
    queryKey: subscriptionKeys.me(audience),
    queryFn: () => fetchSubscriptionDetails(audience),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscriptionFeatureAccess(
  audience: SubscriptionAudience,
  featureKey: FeatureKey,
  enabled = true
) {
  const query = useSubscriptionDetails(audience, enabled);

  return {
    ...query,
    hasAccess: hasIncludedFeature(query.data?.features, featureKey),
  };
}
