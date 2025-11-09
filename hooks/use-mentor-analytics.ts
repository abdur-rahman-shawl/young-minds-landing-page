import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';

// ... (Keep the MentorAnalyticsData interface as is)
export interface MentorAnalyticsData { /* ... */ }

// 1. The hook now accepts a dateRange object as an argument
export function useMentorAnalytics(dateRange: DateRange | undefined) {
  const [data, setData] = useState<MentorAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. The useEffect now depends on dateRange
  useEffect(() => {
    const fetchData = async (from: Date, to: Date) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: from.toISOString(), // This is now 100% safe
          endDate: to.toISOString(),     // This is now 100% safe
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

    // This is the main logic block.
    // We check if the dates are valid first.
    if (dateRange && dateRange.from && dateRange.to) {
      // If they are valid, we call our safe async function.
      fetchData(dateRange.from, dateRange.to);
    } else {
      // If the date range is incomplete, we ensure we are not stuck in a loading state.
      setIsLoading(false);
      setData(null);
    }
  }, [dateRange]); // Re-run this effect whenever dateRange changes

  return { data, isLoading, error };
}