import { useMemo } from 'react';

import { useSession } from '@/lib/auth-client';
import { useBookingsQuery } from '@/hooks/queries/use-booking-queries';
import { buildMenteeDashboardSummary } from '@/lib/dashboard/mentee-dashboard';

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
  const { data: session } = useSession();
  const query = useBookingsQuery(session?.user?.id, 'mentee', {
    enabled: !!session?.user?.id,
  });

  const computed = useMemo(
    () => buildMenteeDashboardSummary(query.data ?? []),
    [query.data]
  );

  return {
    stats: computed.stats,
    summary: computed.summary,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
