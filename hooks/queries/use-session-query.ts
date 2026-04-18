import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/react-query';
import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterOutputs } from '@/lib/trpc/types';

type SessionWithRolesData = RouterOutputs['auth']['sessionWithRoles'];

// Optimized session query with built-in caching and deduplication
export function useSessionWithRolesQuery() {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: queryKeys.sessionWithRoles,
    queryFn: (): Promise<SessionWithRolesData> =>
      trpcClient.auth.sessionWithRoles.query(),
    // Session data is critical - keep it fresh
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Always refetch on focus for security-critical session data
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// Sign in mutation
export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider, credentials }: { provider: string, credentials: any }) => {
      const { signIn } = await import('@/lib/auth-client');
      return signIn(provider, credentials);
    },
    onSuccess: () => {
      // Invalidate session to refetch user data
      return queryClient.invalidateQueries({ queryKey: queryKeys.sessionWithRoles });
    },
  });
}

// Sign out mutation
export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { signOut } = await import('@/lib/auth-client');
      await signOut();
    },
    onSuccess: () => {
      // Clear all query cache on sign out for security
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Sign out failed:', error);
      // Even if sign out fails, clear sensitive data
      queryClient.clear();
    },
  });
}

// Refresh session mutation
export function useRefreshSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Force refetch session data
      await queryClient.invalidateQueries({ 
        queryKey: queryKeys.sessionWithRoles,
        refetchType: 'active'
      });
    },
    onSuccess: () => {
      console.log('Session refreshed successfully');
    },
  });
}
