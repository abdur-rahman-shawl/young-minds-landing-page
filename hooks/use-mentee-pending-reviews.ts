import { useQuery } from '@tanstack/react-query';

import { useTRPCClient } from '@/lib/trpc/react';

interface MenteePendingReview {
  sessionId: string;
  sessionTitle: string;
  sessionEndedAt: string;
  mentor: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export function useMenteePendingReviews(user: { id?: string } | null | undefined) {
  const trpcClient = useTRPCClient();

  const query = useQuery({
    queryKey: ['bookings', 'mentee-pending-reviews', user?.id ?? 'anonymous'],
    queryFn: () => trpcClient.bookings.menteePendingReviews.query(),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    sessionsToReview: (query.data?.data ?? []) as MenteePendingReview[],
    isLoading: user?.id ? query.isLoading : false,
    error: query.error,
    mutate: query.refetch,
  };
}
