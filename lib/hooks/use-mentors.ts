import { useQuery } from '@tanstack/react-query';

import { useTRPCClient } from '@/lib/trpc/react';

interface Mentor {
  id: string;
  userId: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  expertise: string | null;
  experience: number | null;
  hourlyRate: string | null;
  currency: string | null;
  headline: string | null;
  about: string | null;
  linkedinUrl: string | null;
  isAvailable: boolean | null;
  name: string | null;
  email: string | null;
  image: string | null;
  bannerImageUrl?: string | null;
}

interface UseMentorsReturn {
  mentors: Mentor[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseMentorsOptions {
  expertOnly?: boolean;
}

export function useMentors(options?: UseMentorsOptions): UseMentorsReturn {
  const trpcClient = useTRPCClient();
  const expertOnly = options?.expertOnly === true;

  const query = useQuery({
    queryKey: ['mentors', 'directory', { expertOnly }],
    queryFn: () => trpcClient.mentor.list.query({ expertOnly }),
  });

  return {
    mentors: (query.data?.data ?? []) as Mentor[],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
