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

interface SessionToReview {
  sessionId: string;
  sessionTitle: string;
  sessionEndedAt: string;
  mentee: {
    id: string;
    name: string;
    avatar?: string | null;
  }
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

export function useMentorPendingReviews(user: any) {
  // THE FIX: The key for SWR is now conditional.
  // If a user exists, the key is the API URL.
  // If there is no user, the key is `null`, which tells SWR *not* to make a request.
  const key = user?.id ? '/api/sessions/needs-review' : null;

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean, data: SessionToReview[] }>(
    key, // Use the conditional key here
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    // If data exists, return the 'data' property from the API response, otherwise return an empty array.
    sessionsToReview: data?.data || [],
    // If the key is null (no user), we are not loading.
    isLoading: user?.id ? isLoading : false,
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