import { useQuery } from '@tanstack/react-query';

import { useTRPCClient } from '@/lib/trpc/react';

export function useMentorMenteeSessions(enabled = true) {
  const trpcClient = useTRPCClient();

  const query = useQuery({
    queryKey: ['mentor', 'mentee-sessions'],
    queryFn: () => trpcClient.mentor.menteeSessions.query(),
    enabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    mentees: query.data?.mentees ?? [],
    stats: query.data?.stats,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}
