import { useCallback } from 'react';

import type { RouterOutputs } from '@/lib/trpc/types';

import { useSessionWithRolesQuery } from './queries/use-session-query';

type SessionWithRolesData = RouterOutputs['auth']['sessionWithRoles'];

interface UseSessionWithRolesReturn {
  data: SessionWithRolesData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSessionWithRoles(): UseSessionWithRolesReturn {
  const query = useSessionWithRolesQuery();
  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}

// Clear cache when needed (e.g., after sign out)
export function clearSessionCache() {}
