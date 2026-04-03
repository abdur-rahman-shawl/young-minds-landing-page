import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterOutputs } from '@/lib/trpc/types';

type NotificationsList = RouterOutputs['notifications']['list'];
type NotificationItem = NotificationsList['notifications'][number];

export const notificationKeys = {
  all: ['notifications'] as const,
  listPrefix: (userId: string) => ['notifications', userId] as const,
  list: (
    userId: string,
    limit = 10,
    offset = 0,
    unreadOnly = false
  ) => ['notifications', userId, { limit, offset, unreadOnly }] as const,
};

export function useNotificationsQuery(
  userId: string | undefined,
  {
    limit = 10,
    offset = 0,
    unreadOnly = false,
    refetchInterval = 60 * 1000,
  }: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    refetchInterval?: number | false;
  } = {}
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: notificationKeys.list(userId!, limit, offset, unreadOnly),
    queryFn: () =>
      trpcClient.notifications.list.query({
        limit,
        offset,
        unreadOnly,
      }),
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval,
  });
}

export function useUpdateNotificationMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      notificationId,
      userId,
      isRead,
      isArchived,
    }: {
      notificationId: string;
      userId: string;
      isRead?: boolean;
      isArchived?: boolean;
    }) =>
      trpcClient.notifications.update.mutate({
        notificationId,
        isRead,
        isArchived,
      }),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.listPrefix(variables.userId),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update notification'
      );
    },
  });
}

export function useDeleteNotificationMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      notificationId,
      userId,
    }: {
      notificationId: string;
      userId: string;
    }) =>
      trpcClient.notifications.delete.mutate({
        notificationId,
      }),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.listPrefix(variables.userId),
      });
      toast.success('Notification deleted');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete notification'
      );
    },
  });
}

export function useBulkNotificationsMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId: _userId,
      action,
      notificationIds,
      markAllAsRead,
    }: {
      userId: string;
      action: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive' | 'delete';
      notificationIds?: string[];
      markAllAsRead?: boolean;
    }) =>
      trpcClient.notifications.bulkUpdate.mutate({
        action,
        notificationIds,
        markAllAsRead,
      }),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.listPrefix(variables.userId),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update notifications'
      );
    },
  });
}

export type { NotificationItem, NotificationsList };
