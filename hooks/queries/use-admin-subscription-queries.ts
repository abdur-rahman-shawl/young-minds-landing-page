import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterOutputs } from '@/lib/trpc/types';

type AdminSubscriptionStats = RouterOutputs['subscriptions']['adminStats'];
type AdminSubscriptionPlan = RouterOutputs['subscriptions']['adminListPlans'][number];
type AdminSubscriptionFeature = RouterOutputs['subscriptions']['adminListFeatures'][number];
type AdminSubscriptionFeatureCategory =
  RouterOutputs['subscriptions']['adminListFeatureCategories'][number];
type AdminPlanFeature = RouterOutputs['subscriptions']['adminListPlanFeatures'][number];
type AdminPlanPrice = RouterOutputs['subscriptions']['adminListPlanPrices'][number];
type AdminSubscriptionList = RouterOutputs['subscriptions']['adminListSubscriptions'];
type AdminSubscriptionAnalytics =
  RouterOutputs['subscriptions']['adminAnalytics'];
type AdminSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'incomplete'
  | 'expired';

export const adminSubscriptionKeys = {
  all: ['admin-subscriptions'] as const,
  stats: () => [...adminSubscriptionKeys.all, 'stats'] as const,
  plans: () => [...adminSubscriptionKeys.all, 'plans'] as const,
  features: () => [...adminSubscriptionKeys.all, 'features'] as const,
  featureCategories: () =>
    [...adminSubscriptionKeys.all, 'feature-categories'] as const,
  planFeatures: (planId: string) =>
    [...adminSubscriptionKeys.all, 'plan-features', planId] as const,
  planPrices: (planId: string) =>
    [...adminSubscriptionKeys.all, 'plan-prices', planId] as const,
  subscriptions: (input: {
    statuses?: AdminSubscriptionStatus[];
    audience?: 'all' | 'mentor' | 'mentee';
    page: number;
    pageSize: number;
  }) => [...adminSubscriptionKeys.all, 'subscriptions', input] as const,
  analytics: (input?: {
    startDate?: string;
    endDate?: string;
    audience?: 'all' | 'mentor' | 'mentee';
  }) => [...adminSubscriptionKeys.all, 'analytics', input ?? {}] as const,
};

async function invalidateAdminSubscriptionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  options?: { planId?: string }
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminSubscriptionKeys.all }),
    options?.planId
      ? queryClient.invalidateQueries({
          queryKey: adminSubscriptionKeys.planFeatures(options.planId),
        })
      : Promise.resolve(),
    options?.planId
      ? queryClient.invalidateQueries({
          queryKey: adminSubscriptionKeys.planPrices(options.planId),
        })
      : Promise.resolve(),
  ]);
}

export function useAdminSubscriptionStatsQuery() {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.stats(),
    queryFn: () => trpcClient.subscriptions.adminStats.query({}),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSubscriptionPlansQuery() {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.plans(),
    queryFn: () => trpcClient.subscriptions.adminListPlans.query(),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSubscriptionFeaturesQuery() {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.features(),
    queryFn: () => trpcClient.subscriptions.adminListFeatures.query(),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSubscriptionFeatureCategoriesQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.featureCategories(),
    queryFn: () => trpcClient.subscriptions.adminListFeatureCategories.query(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminPlanFeaturesQuery(planId: string | null | undefined) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.planFeatures(planId!),
    queryFn: () =>
      trpcClient.subscriptions.adminListPlanFeatures.query({
        planId: planId!,
      }),
    enabled: !!planId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminPlanPricesQuery(planId: string | null | undefined) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.planPrices(planId!),
    queryFn: () =>
      trpcClient.subscriptions.adminListPlanPrices.query({
        planId: planId!,
      }),
    enabled: !!planId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSubscriptionsListQuery(input: {
  statuses?: AdminSubscriptionStatus[];
  audience?: 'all' | 'mentor' | 'mentee';
  page: number;
  pageSize: number;
}) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.subscriptions(input),
    queryFn: () =>
      trpcClient.subscriptions.adminListSubscriptions.query({
        statuses: input.statuses,
        audience: input.audience,
        page: input.page,
        pageSize: input.pageSize,
      }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSubscriptionAnalyticsQuery(input?: {
  startDate?: string;
  endDate?: string;
  audience?: 'all' | 'mentor' | 'mentee';
}) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSubscriptionKeys.analytics(input),
    queryFn: () =>
      trpcClient.subscriptions.adminAnalytics.query({
        startDate: input?.startDate,
        endDate: input?.endDate,
        audience: input?.audience,
      }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminCreateSubscriptionPlanMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      plan_key: string;
      audience: 'mentor' | 'mentee';
      name: string;
      description?: string;
      status: 'draft' | 'active';
    }) => trpcClient.subscriptions.adminCreatePlan.mutate(input),
    onSuccess: async () => {
      await invalidateAdminSubscriptionQueries(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create plan');
    },
  });
}

export function useAdminUpdateSubscriptionPlanMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      planId: string;
      name?: string;
      description?: string | null;
      status?: 'draft' | 'active' | 'archived';
      sort_order?: number;
      metadata?: Record<string, unknown>;
    }) => trpcClient.subscriptions.adminUpdatePlan.mutate(input),
    onSuccess: async () => {
      await invalidateAdminSubscriptionQueries(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan');
    },
  });
}

export function useAdminDeleteSubscriptionPlanMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { planId: string }) =>
      trpcClient.subscriptions.adminDeletePlan.mutate(input),
    onSuccess: async () => {
      await invalidateAdminSubscriptionQueries(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete plan');
    },
  });
}

export function useAdminCreateSubscriptionFeatureMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      feature_key: string;
      name: string;
      description?: string | null;
      category_id?: string | null;
      value_type:
        | 'boolean'
        | 'count'
        | 'minutes'
        | 'text'
        | 'amount'
        | 'percent'
        | 'json';
      unit?: string | null;
      is_metered: boolean;
    }) => trpcClient.subscriptions.adminCreateFeature.mutate(input),
    onSuccess: async () => {
      await invalidateAdminSubscriptionQueries(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create feature');
    },
  });
}

export function useAdminUpdateSubscriptionFeatureMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      featureId: string;
      name?: string;
      feature_key?: string;
      description?: string | null;
      category_id?: string | null;
      value_type?:
        | 'boolean'
        | 'count'
        | 'minutes'
        | 'text'
        | 'amount'
        | 'percent'
        | 'json';
      unit?: string | null;
      is_metered?: boolean;
    }) => trpcClient.subscriptions.adminUpdateFeature.mutate(input),
    onSuccess: async () => {
      await invalidateAdminSubscriptionQueries(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update feature');
    },
  });
}

export function useAdminUpsertPlanFeatureMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      planId: string;
      feature_id: string;
      is_included?: boolean;
      limit_count?: number | null;
      limit_minutes?: number | null;
      limit_text?: string | null;
      limit_amount?: number | null;
      limit_currency?: string | null;
      limit_percent?: number | null;
      limit_json?: Record<string, unknown> | null;
      limit_interval?: 'day' | 'week' | 'month' | 'year' | null;
      limit_interval_count?: number | null;
    }) => trpcClient.subscriptions.adminUpsertPlanFeature.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSubscriptionQueries(queryClient, {
        planId: variables.planId,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save plan feature'
      );
    },
  });
}

export function useAdminCreatePlanPriceMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      planId: string;
      price_type: 'standard' | 'introductory';
      billing_interval: 'day' | 'week' | 'month' | 'year';
      billing_interval_count: number;
      amount: number;
      currency: string;
      is_active?: boolean;
      effective_from?: string;
      effective_to?: string;
    }) => trpcClient.subscriptions.adminCreatePlanPrice.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSubscriptionQueries(queryClient, {
        planId: variables.planId,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add price');
    },
  });
}

export function useAdminUpdatePlanPriceMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      planId: string;
      priceId: string;
      price_type?: 'standard' | 'introductory';
      billing_interval?: 'day' | 'week' | 'month' | 'year';
      billing_interval_count?: number;
      amount?: number;
      currency?: string;
      is_active?: boolean;
      effective_from?: string | null;
      effective_to?: string | null;
    }) => trpcClient.subscriptions.adminUpdatePlanPrice.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSubscriptionQueries(queryClient, {
        planId: variables.planId,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update price');
    },
  });
}

export type {
  AdminPlanFeature,
  AdminPlanPrice,
  AdminSubscriptionAnalytics,
  AdminSubscriptionFeature,
  AdminSubscriptionFeatureCategory,
  AdminSubscriptionList,
  AdminSubscriptionPlan,
  AdminSubscriptionStatus,
  AdminSubscriptionStats,
};
