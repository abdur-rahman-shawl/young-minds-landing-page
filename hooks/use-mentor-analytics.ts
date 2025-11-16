import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';

export interface MentorAnalyticsData {
  kpis: {
    totalCompletedSessions: number;
    totalEarnings: number;
    periodEarnings: number;
    averageRating: number | null;
    unreadMessages: number;
  };
  earningsOverTime: { month: string; earnings: number }[];
  upcomingSessions: {
    sessionId: string;
    menteeName: string;
    title: string;
    scheduledAt: string;
  }[];
  recentReviews: {
    reviewId: string;
    menteeName: string;
    rating: number;
    feedback: string;
  }[];
}

export function useMentorAnalytics(dateRange: DateRange | undefined) {
  const [data, setData] = useState<MentorAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This useEffect block now has the correct, working logic
  useEffect(() => {
    const fetchData = async (from: Date, to: Date) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: from.toISOString(),
          endDate: to.toISOString(),
        });
        const response = await fetch(`/api/analytics/mentor?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch mentor analytics');
        }

        const result: MentorAnalyticsData = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Main logic: check for valid dates and then fetch
    if (dateRange && dateRange.from && dateRange.to) {
      fetchData(dateRange.from, dateRange.to);
    } else {
      // If dates are not valid, ensure we don't get stuck loading
      setIsLoading(false);
      setData(null);
    }
  }, [dateRange]);

  return { data, isLoading, error };
}