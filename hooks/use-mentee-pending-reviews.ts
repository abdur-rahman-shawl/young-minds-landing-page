import useSWR from 'swr';

interface MenteePendingReview {
  sessionId: string;
  sessionTitle: string;
  sessionEndedAt: string;
  mentor: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
};

export function useMenteePendingReviews(user: any) {
  // The key for SWR is conditional. If a user exists, the key is the API URL.
  // If there is no user, the key is `null`, which tells SWR *not* to make a request.
  const key = user?.id ? '/api/sessions/needs-review-mentee' : null;

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: MenteePendingReview[] }>(
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