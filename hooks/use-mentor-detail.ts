'use client';

import { useMentorQuery } from '@/hooks/queries/use-mentor-queries';

type MentorDetail = NonNullable<
  ReturnType<typeof useMentorQuery>['data']
>['data'];

interface UseMentorDetailReturn {
  mentor: MentorDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMentorDetail(
  mentorId: string | null
): UseMentorDetailReturn {
  const query = useMentorQuery(mentorId ?? '');

  return {
    mentor: query.data?.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
