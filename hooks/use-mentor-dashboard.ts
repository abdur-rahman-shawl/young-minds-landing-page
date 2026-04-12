import { useQuery } from '@tanstack/react-query';

import { useTRPCClient } from '@/lib/trpc/react';

interface MentorDashboardStats {
  activeMentees: number;
  totalMentees: number;
  upcomingSessions: number;
  completedSessions: number;
  monthlyEarnings: number;
  totalEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  unreadMessages: number;
  totalMessages: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
}

interface RecentSession {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date;
  duration: number;
  meetingType: string;
  mentee: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface SessionToReview {
  sessionId: string;
  sessionTitle: string;
  sessionEndedAt: string;
  mentee: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

interface RecentMessage {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function useMentorDashboardStats() {
  const trpcClient = useTRPCClient();

  const query = useQuery({
    queryKey: ['mentor', 'dashboard-stats'],
    queryFn: (): Promise<MentorDashboardStats> =>
      trpcClient.mentor.dashboardStats.query(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}

export function useMentorRecentSessions(limit = 5) {
  const trpcClient = useTRPCClient();

  const query = useQuery({
    queryKey: ['mentor', 'recent-sessions', limit],
    queryFn: () => trpcClient.mentor.recentSessions.query({ limit }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    sessions: (query.data?.sessions ?? []) as RecentSession[],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}

export function useMentorPendingReviews(user: { id?: string } | null | undefined) {
  const trpcClient = useTRPCClient();

  const query = useQuery({
    queryKey: ['mentor', 'pending-reviews', user?.id ?? 'anonymous'],
    queryFn: () => trpcClient.mentor.pendingReviews.query(),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    sessionsToReview: (query.data?.data ?? []) as SessionToReview[],
    isLoading: user?.id ? query.isLoading : false,
    error: query.error,
    mutate: query.refetch,
  };
}

export function useMentorRecentMessages(limit = 5) {
  const trpcClient = useTRPCClient();

  const query = useQuery({
    queryKey: ['mentor', 'recent-messages', limit],
    queryFn: () => trpcClient.mentor.recentMessages.query({ limit }),
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
    refetchInterval: 30 * 1000,
  });

  return {
    messages: (query.data?.messages ?? []) as RecentMessage[],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}
