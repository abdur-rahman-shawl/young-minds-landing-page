import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { bookingKeys } from './use-booking-queries';
import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterOutputs } from '@/lib/trpc/types';

type AdminSessionsList = RouterOutputs['bookings']['adminList'];
type AdminSessionItem = AdminSessionsList['sessions'][number];
type AdminSessionPagination = AdminSessionsList['pagination'];
type AdminSessionStats = RouterOutputs['bookings']['adminStats'];
type AdminSessionDetail = RouterOutputs['bookings']['adminGet'];
type AdminSessionNote = RouterOutputs['bookings']['adminListNotes'][number];

export const adminSessionKeys = {
  all: ['admin-sessions'] as const,
  list: (input: {
    page: number;
    limit: number;
    status?: string[];
    search?: string;
    mentorId?: string;
    menteeId?: string;
    startDate?: string;
    endDate?: string;
    meetingType?: string;
    refundStatus?: string;
    wasReassigned?: boolean;
    sortBy?: 'scheduledAt' | 'createdAt' | 'updatedAt' | 'status';
    sortOrder?: 'asc' | 'desc';
  }) => ['admin-sessions', 'list', input] as const,
  stats: (input?: { startDate?: string; endDate?: string }) =>
    ['admin-sessions', 'stats', input ?? {}] as const,
  detail: (bookingId: string) => ['admin-sessions', 'detail', bookingId] as const,
  notes: (bookingId: string) => ['admin-sessions', 'notes', bookingId] as const,
};

async function invalidateAdminSessionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId?: string
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminSessionKeys.all }),
    queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
    bookingId
      ? queryClient.invalidateQueries({
          queryKey: adminSessionKeys.detail(bookingId),
        })
      : Promise.resolve(),
    bookingId
      ? queryClient.invalidateQueries({
          queryKey: adminSessionKeys.notes(bookingId),
        })
      : Promise.resolve(),
  ]);
}

export function useAdminSessionsQuery(input: {
  page: number;
  limit: number;
  status?: string[];
  search?: string;
  mentorId?: string;
  menteeId?: string;
  startDate?: string;
  endDate?: string;
  meetingType?: string;
  refundStatus?: string;
  wasReassigned?: boolean;
  sortBy?: 'scheduledAt' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSessionKeys.list(input),
    queryFn: () =>
      trpcClient.bookings.adminList.query({
        page: input.page,
        limit: input.limit,
        status: input.status,
        search: input.search,
        mentorId: input.mentorId,
        menteeId: input.menteeId,
        startDate: input.startDate,
        endDate: input.endDate,
        meetingType: input.meetingType,
        refundStatus: input.refundStatus,
        wasReassigned: input.wasReassigned,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSessionStatsQuery(input?: {
  startDate?: string;
  endDate?: string;
}) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSessionKeys.stats(input),
    queryFn: () =>
      trpcClient.bookings.adminStats.query({
        startDate: input?.startDate,
        endDate: input?.endDate,
      }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSessionDetailQuery(bookingId: string | undefined | null) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSessionKeys.detail(bookingId!),
    queryFn: () =>
      trpcClient.bookings.adminGet.query({
        bookingId: bookingId!,
      }),
    enabled: !!bookingId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminSessionNotesQuery(bookingId: string | undefined | null) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminSessionKeys.notes(bookingId!),
    queryFn: () =>
      trpcClient.bookings.adminListNotes.query({
        bookingId: bookingId!,
      }),
    enabled: !!bookingId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminCancelSessionMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      reason: string;
      refundPercentage?: number;
      notifyParties?: boolean;
    }) => trpcClient.bookings.adminCancel.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSessionQueries(queryClient, variables.bookingId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel session');
    },
  });
}

export function useAdminCompleteSessionMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      reason: string;
      actualDuration?: number;
    }) => trpcClient.bookings.adminComplete.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSessionQueries(queryClient, variables.bookingId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to complete session');
    },
  });
}

export function useAdminRefundSessionMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      amount: number;
      reason: string;
      refundType?: 'full' | 'partial' | 'bonus';
    }) => trpcClient.bookings.adminRefund.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSessionQueries(queryClient, variables.bookingId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to issue refund');
    },
  });
}

export function useAdminClearNoShowMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      reason: string;
      restoreStatus?: 'completed' | 'cancelled';
    }) => trpcClient.bookings.adminClearNoShow.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSessionQueries(queryClient, variables.bookingId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to clear no-show');
    },
  });
}

export function useAdminReassignSessionMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      newMentorId: string;
      reason: string;
      notifyParties?: boolean;
    }) => trpcClient.bookings.adminReassign.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSessionQueries(queryClient, variables.bookingId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reassign session');
    },
  });
}

export function useAdminAddSessionNoteMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      note: string;
    }) => trpcClient.bookings.adminAddNote.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateAdminSessionQueries(queryClient, variables.bookingId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add note');
    },
  });
}

export type {
  AdminSessionDetail,
  AdminSessionItem,
  AdminSessionNote,
  AdminSessionPagination,
  AdminSessionStats,
  AdminSessionsList,
};
