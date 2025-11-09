import { useState, useEffect } from 'react';

// 1. Define the shape of the data we expect from our new API endpoint.
// This helps with autocompletion and prevents bugs.
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

// 2. This is our custom hook function.
export function useMentorAnalytics() {
  // 3. Set up state variables to hold our data, loading status, and any errors.
  const [data, setData] = useState<MentorAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4. Use the useEffect hook to fetch data when the component using this hook is first loaded.
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Reset states before fetching
        setIsLoading(true);
        setError(null);

        // Call our new API endpoint
        const response = await fetch('/api/analytics/mentor');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch mentor analytics');
        }

        const result: MentorAnalyticsData = await response.json();
        setData(result); // Store the successful response in our state

      } catch (err: any) {
        setError(err.message); // Store any error message
      } finally {
        setIsLoading(false); // Always stop loading, whether it succeeded or failed
      }
    };

    fetchData();
  }, []); // The empty array [] ensures this code runs only once.

  // 5. Return the state variables so the component can use them.
  return { data, isLoading, error };
}