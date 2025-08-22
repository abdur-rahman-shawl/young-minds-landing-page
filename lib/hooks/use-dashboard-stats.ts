import { useState, useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';

interface StatItem {
  value: string | number;
  description: string;
  trend: 'up' | 'down' | 'neutral';
}

interface DashboardStats {
  sessionsBooked: StatItem;
  hoursLearned: StatItem;
  mentorsConnected: StatItem;
}

interface DashboardSummary {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalHours: string;
  lastMonthSessions: number;
  lastWeekSessions: number;
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const hasFetched = useRef(false);

  const fetchStats = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard/stats');
      const result = await response.json();
      
      if (response.ok) {
        setStats(result.stats);
        setSummary(result.summary);
      } else {
        setError(result.error || 'Failed to fetch dashboard statistics');
      }
    } catch (err) {
      setError('Network error occurred while fetching statistics');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
      hasFetched.current = true;
    }
  };

  useEffect(() => {
    // Only fetch if we have a session and haven't fetched yet
    if (session?.user?.id && !hasFetched.current) {
      fetchStats();
    } else if (session === null) {
      // Session loaded but user is not authenticated
      setLoading(false);
    }
  }, [session?.user?.id]); // Re-run when session changes

  return {
    stats,
    summary,
    loading,
    error,
    refetch: fetchStats
  };
}