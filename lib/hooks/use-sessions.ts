import { useMemo } from 'react';

import { useSession } from '@/lib/auth-client';
import {
  useBookingsQuery,
  useCancelBookingMutation,
  useCreateBookingMutation,
} from '@/hooks/queries/use-booking-queries';
import { buildLegacySessions } from '@/lib/dashboard/mentee-dashboard';

interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  scheduledAt: string;
  duration: number;
  status: string;
  topic: string | null;
  notes: string | null;
  rating: number | null;
  feedback: string | null;
  mentorName: string;
  mentorTitle: string | null;
  mentorCompany: string | null;
  mentorImage?: string | null;
}

interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  bookSession: (sessionData: any) => Promise<boolean>;
  cancelSession: (sessionId: string) => Promise<boolean>;
}

export function useSessions(
  type: 'upcoming' | 'past' | 'all' = 'all'
): UseSessionsReturn {
  const { data: session } = useSession();
  const bookingsQuery = useBookingsQuery(session?.user?.id, 'mentee', {
    enabled: !!session?.user?.id,
  });
  const createBookingMutation = useCreateBookingMutation();
  const cancelBookingMutation = useCancelBookingMutation();

  const sessions = useMemo(() => {
    return buildLegacySessions(bookingsQuery.data ?? [], type);
  }, [bookingsQuery.data, type]);

  return {
    sessions,
    loading: bookingsQuery.isLoading,
    error:
      bookingsQuery.error instanceof Error ? bookingsQuery.error.message : null,
    refetch: () => {
      void bookingsQuery.refetch();
    },
    bookSession: async (sessionData: any) => {
      try {
        await createBookingMutation.mutateAsync({
          mentorId: sessionData.mentorId,
          sessionType: sessionData.sessionType ?? 'PAID',
          title: sessionData.title ?? sessionData.topic ?? 'Mentoring Session',
          description: sessionData.description ?? sessionData.notes,
          scheduledAt: sessionData.scheduledAt,
          duration: sessionData.duration ?? 60,
          meetingType: sessionData.meetingType ?? 'video',
          location: sessionData.location,
          bookingSource: sessionData.bookingSource,
        });
        return true;
      } catch {
        return false;
      }
    },
    cancelSession: async (sessionId: string) => {
      try {
        await cancelBookingMutation.mutateAsync({
          bookingId: sessionId,
          reasonCategory: 'no_longer_needed',
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}
