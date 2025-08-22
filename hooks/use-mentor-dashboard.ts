import useSWR from 'swr';

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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
};

export function useMentorDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<MentorDashboardStats>(
    '/api/mentor/dashboard-stats',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    stats: data,
    isLoading,
    error,
    mutate,
  };
}

export function useMentorRecentSessions(limit: number = 5) {
  const { data, error, isLoading, mutate } = useSWR<{ sessions: RecentSession[]; count: number }>(
    `/api/mentor/recent-sessions?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    sessions: data?.sessions || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useMentorRecentMessages(limit: number = 5) {
  const { data, error, isLoading, mutate } = useSWR<{ messages: RecentMessage[]; count: number }>(
    `/api/mentor/recent-messages?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30 seconds for messages
    }
  );

  return {
    messages: data?.messages || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}