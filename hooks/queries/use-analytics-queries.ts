import { useQuery } from '@tanstack/react-query';

import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterOutputs } from '@/lib/trpc/types';

type MentorAnalyticsData = RouterOutputs['analytics']['mentorDashboard'];
type MenteeLearningAnalyticsData = RouterOutputs['analytics']['menteeLearning'];
type AdminAnalyticsData = RouterOutputs['analytics']['adminDashboard'];

export const analyticsKeys = {
  all: ['analytics'] as const,
  mentor: (input?: { startDate?: string; endDate?: string }) =>
    ['analytics', 'mentor', input ?? {}] as const,
  mentee: (input?: { timeRange?: number }) =>
    ['analytics', 'mentee', input ?? {}] as const,
  admin: (input?: { startDate?: string; endDate?: string }) =>
    ['analytics', 'admin', input ?? {}] as const,
};

export function useMentorAnalyticsQuery(
  input?: { startDate?: string; endDate?: string },
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: analyticsKeys.mentor(input),
    queryFn: () =>
      trpcClient.analytics.mentorDashboard.query({
        startDate: input?.startDate,
        endDate: input?.endDate,
      }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useMenteeLearningAnalyticsQuery(
  input?: { timeRange?: number },
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: analyticsKeys.mentee(input),
    queryFn: () =>
      trpcClient.analytics.menteeLearning.query({
        timeRange: input?.timeRange,
      }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminAnalyticsQuery(
  input?: { startDate?: string; endDate?: string },
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: analyticsKeys.admin(input),
    queryFn: () =>
      trpcClient.analytics.adminDashboard.query({
        startDate: input?.startDate,
        endDate: input?.endDate,
      }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export type {
  AdminAnalyticsData,
  MenteeLearningAnalyticsData,
  MentorAnalyticsData,
};
