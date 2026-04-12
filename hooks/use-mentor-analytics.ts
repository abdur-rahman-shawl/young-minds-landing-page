import { DateRange } from 'react-day-picker';

import {
  useMentorAnalyticsQuery,
  type MentorAnalyticsData,
} from '@/hooks/queries/use-analytics-queries';

export type { MentorAnalyticsData };

export function useMentorAnalytics(dateRange: DateRange | undefined, enabled = true) {
  const query = useMentorAnalyticsQuery(
    {
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString(),
    },
    enabled && Boolean(dateRange?.from && dateRange?.to)
  );

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
