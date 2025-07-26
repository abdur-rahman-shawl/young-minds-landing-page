import { QueryClient } from '@tanstack/react-query';

// Global query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered stale after 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 30 minutes
      gcTime: 30 * 60 * 1000, // Replaces cacheTime in v5
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Refetch on window focus for critical data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Session and auth
  session: ['session'] as const,
  sessionWithRoles: ['session', 'with-roles'] as const,
  
  // User data
  userProfile: (userId: string) => ['user', 'profile', userId] as const,
  userRoles: (userId: string) => ['user', 'roles', userId] as const,
  
  // Mentors
  mentors: ['mentors'] as const,
  mentorsList: (filters?: any) => ['mentors', 'list', filters] as const,
  mentorDetail: (id: string) => ['mentors', 'detail', id] as const,
  mentorProfile: (userId: string) => ['mentors', 'profile', userId] as const,
  
  // Mentees
  mentees: ['mentees'] as const,
  menteesList: (filters?: any) => ['mentees', 'list', filters] as const,
  menteeProfile: (userId: string) => ['mentees', 'profile', userId] as const,
  
  // Messages
  messages: ['messages'] as const,
  messagesList: (userId: string) => ['messages', 'list', userId] as const,
  conversation: (participantIds: string[]) => ['messages', 'conversation', ...participantIds.sort()] as const,
  
  // Sessions
  sessions: ['sessions'] as const,
  sessionsList: (userId: string) => ['sessions', 'list', userId] as const,
  sessionDetail: (id: string) => ['sessions', 'detail', id] as const,
  
  // Saved items
  savedMentors: (userId: string) => ['saved', 'mentors', userId] as const,
  
  // Admin data
  admin: ['admin'] as const,
  adminMentors: (filters?: any) => ['admin', 'mentors', filters] as const,
  adminMentees: (filters?: any) => ['admin', 'mentees', filters] as const,
  adminOverview: ['admin', 'overview'] as const,
} as const;

// Utility function for invalidating related queries
export const invalidateQueries = {
  // Invalidate all user-related data when user profile changes
  userProfile: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userRoles(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionWithRoles });
  },
  
  // Invalidate mentor data
  mentorProfile: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mentorProfile(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.mentors });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionWithRoles });
  },
  
  // Invalidate all session data
  session: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.session });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionWithRoles });
  },
  
  // Invalidate messages
  messages: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.messagesList(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.messages });
  },
  
  // Invalidate sessions
  sessions: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
  },
};