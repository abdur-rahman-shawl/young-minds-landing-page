import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/react-query';

interface SessionWithRolesData {
  session: any;
  user: any;
  roles: any[];
  mentorProfile: any;
  isAdmin: boolean;
  isMentor: boolean;
  isMentee: boolean;
  isMentorWithIncompleteProfile: boolean;
}

// Optimized session query with built-in caching and deduplication
export function useSessionWithRolesQuery() {
  return useQuery({
    queryKey: queryKeys.sessionWithRoles,
    queryFn: async (): Promise<SessionWithRolesData | null> => {
      const response = await fetch('/api/auth/session-with-roles', {
        credentials: 'include',
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch session');
      }
    },
    // Session data is critical - keep it fresh
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Always refetch on focus for security-critical session data
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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