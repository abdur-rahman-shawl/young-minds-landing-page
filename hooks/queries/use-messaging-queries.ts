import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterOutputs } from '@/lib/trpc/types';
import { getNextThreadHistoryOffset } from '@/lib/messaging/thread-history';

type Thread = RouterOutputs['messaging']['listThreads'][number];
type ThreadData = RouterOutputs['messaging']['getThread'];
type ThreadPage = RouterOutputs['messaging']['getThread'];
type Message = ThreadData['messages'][number];
type MessageRequest = RouterOutputs['messaging']['listRequests'][number];
type ReactionGroup = RouterOutputs['messaging']['listMessageReactions'][number];

export const DEFAULT_THREAD_LIMIT = 50;
export const DEFAULT_THREAD_OFFSET = 0;

export const messagingKeys = {
  all: ['messaging'] as const,
  threadsPrefix: (userId: string) => ['messaging', 'threads', userId] as const,
  threads: (userId: string, includeArchived = false) =>
    ['messaging', 'threads', userId, { includeArchived }] as const,
  threadPrefix: (threadId: string, userId: string) =>
    ['messaging', 'thread', threadId, userId] as const,
  threadHistory: (
    threadId: string,
    userId: string,
    limit = DEFAULT_THREAD_LIMIT
  ) => ['messaging', 'thread', threadId, userId, { limit, infinite: true }] as const,
  thread: (
    threadId: string,
    userId: string,
    limit = DEFAULT_THREAD_LIMIT,
    offset = DEFAULT_THREAD_OFFSET
  ) => ['messaging', 'thread', threadId, userId, { limit, offset }] as const,
  requestsPrefix: (userId: string) => ['messaging', 'requests', userId] as const,
  requests: (
    userId: string,
    type: 'all' | 'sent' | 'received' = 'received',
    status = 'pending'
  ) => ['messaging', 'requests', userId, { type, status }] as const,
  messageReactions: (messageId: string, userId: string) =>
    ['messaging', 'message-reactions', messageId, userId] as const,
  unreadCount: (userId: string) => ['messaging', 'unread', userId] as const,
};

export function useThreadsQuery(
  userId: string | undefined,
  includeArchived = false,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: messagingKeys.threads(userId!, includeArchived),
    queryFn: () =>
      trpcClient.messaging.listThreads.query({
        includeArchived,
      }),
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useThreadQuery(
  threadId: string | null,
  userId: string | undefined,
  limit = DEFAULT_THREAD_LIMIT,
  offset = DEFAULT_THREAD_OFFSET,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: messagingKeys.thread(threadId!, userId!, limit, offset),
    queryFn: () =>
      trpcClient.messaging.getThread.query({
        threadId: threadId!,
        limit,
        offset,
      }),
    enabled: !!threadId && !!userId && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useInfiniteThreadQuery(
  threadId: string | null,
  userId: string | undefined,
  limit = DEFAULT_THREAD_LIMIT,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useInfiniteQuery({
    queryKey: messagingKeys.threadHistory(threadId!, userId!, limit),
    queryFn: ({ pageParam }) =>
      trpcClient.messaging.getThread.query({
        threadId: threadId!,
        limit,
        offset: pageParam as number,
      }),
    initialPageParam: DEFAULT_THREAD_OFFSET,
    getNextPageParam: (lastPage: ThreadPage, allPages: ThreadPage[]) =>
      lastPage.hasMore ? getNextThreadHistoryOffset(allPages) : undefined,
    enabled: !!threadId && !!userId && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useMessageRequestsQuery(
  userId: string | undefined,
  type: 'all' | 'sent' | 'received' = 'received',
  status = 'pending',
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: messagingKeys.requests(userId!, type, status),
    queryFn: () =>
      trpcClient.messaging.listRequests.query({
        type,
        status,
      }),
    enabled: !!userId && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useMessageReactionsQuery(
  messageId: string | undefined,
  userId: string | undefined,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: messagingKeys.messageReactions(messageId!, userId!),
    queryFn: () =>
      trpcClient.messaging.listMessageReactions.query({
        messageId: messageId!,
      }),
    enabled: !!messageId && !!userId && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useUnreadCountQuery(
  userId: string | undefined,
  enabled = true
) {
  const { data: threads } = useThreadsQuery(userId, false, enabled);
  const { data: requests } = useMessageRequestsQuery(
    userId,
    'received',
    'pending',
    enabled
  );

  const unreadThreadsCount =
    threads?.reduce((accumulator, thread) => accumulator + thread.unreadCount, 0) ?? 0;
  const pendingRequestsCount = requests?.length ?? 0;

  return {
    unreadThreadsCount,
    pendingRequestsCount,
    totalUnreadCount: unreadThreadsCount + pendingRequestsCount,
  };
}

export function useSendMessageMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      content,
      replyToId,
    }: {
      threadId: string;
      userId: string;
      content: string;
      replyToId?: string;
    }) =>
      trpcClient.messaging.sendMessage.mutate({
        threadId,
        content,
        replyToId,
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threadPrefix(variables.threadId, variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threadsPrefix(variables.userId),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    },
  });
}

export function useHandleRequestMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      userId,
      action,
      responseMessage,
    }: {
      requestId: string;
      userId: string;
      action: 'accept' | 'reject' | 'cancel';
      responseMessage?: string;
    }) =>
      trpcClient.messaging.handleRequest.mutate({
        requestId,
        action,
        responseMessage,
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagingKeys.requestsPrefix(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threadsPrefix(variables.userId),
        }),
      ]);

      const actionText =
        variables.action === 'accept'
          ? 'accepted'
          : variables.action === 'reject'
            ? 'rejected'
            : 'cancelled';

      toast.success(`Request ${actionText} successfully`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to process request');
    },
  });
}

export function useSendRequestMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      recipientId,
      initialMessage,
      requestType,
      requestReason,
    }: {
      userId: string;
      recipientId: string;
      initialMessage: string;
      requestType: 'mentor_to_mentee' | 'mentee_to_mentor';
      requestReason?: string;
    }) =>
      trpcClient.messaging.sendRequest.mutate({
        recipientId,
        initialMessage,
        requestType,
        requestReason,
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: messagingKeys.requestsPrefix(variables.userId),
      });
      toast.success('Message request sent successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send request');
    },
  });
}

export function useArchiveThreadMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
    }: {
      threadId: string;
      userId: string;
    }) =>
      trpcClient.messaging.updateThread.mutate({
        threadId,
        action: 'archive',
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: messagingKeys.threadsPrefix(variables.userId),
      });
      toast.success('Conversation archived');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to archive thread');
    },
  });
}

export function useMarkAsReadMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
    }: {
      threadId: string;
      userId: string;
    }) =>
      trpcClient.messaging.updateThread.mutate({
        threadId,
        action: 'markAsRead',
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threadPrefix(variables.threadId, variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threadsPrefix(variables.userId),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as read');
    },
  });
}

export function useEditMessageMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
      messageId,
      content,
    }: {
      threadId: string;
      userId: string;
      messageId: string;
      content: string;
    }) =>
      trpcClient.messaging.editMessage.mutate({
        messageId,
        content,
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: messagingKeys.threadPrefix(variables.threadId, variables.userId),
      });
      toast.success('Message edited');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to edit message');
    },
  });
}

export function useDeleteMessageMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
      messageId,
    }: {
      threadId: string;
      userId: string;
      messageId: string;
    }) =>
      trpcClient.messaging.deleteMessage.mutate({
        messageId,
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: messagingKeys.threadPrefix(variables.threadId, variables.userId),
      });
      toast.success('Message deleted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
    },
  });
}

export function useToggleReactionMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
      messageId,
      emoji,
    }: {
      threadId?: string;
      userId: string;
      messageId: string;
      emoji: string;
    }) =>
      trpcClient.messaging.toggleMessageReaction.mutate({
        messageId,
        emoji,
      }),
    onSuccess: async (_data, variables) => {
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messageReactions(variables.messageId, variables.userId),
        }),
      ];

      if (variables.threadId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: messagingKeys.threadPrefix(variables.threadId, variables.userId),
          })
        );
      }

      await Promise.all(invalidations);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update reaction';
      toast.error(message);
    },
  });
}

export function usePrefetchThread() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return (threadId: string, userId: string) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: messagingKeys.threadHistory(threadId, userId),
      queryFn: ({ pageParam }) =>
        trpcClient.messaging.getThread.query({
          threadId,
          limit: DEFAULT_THREAD_LIMIT,
          offset: pageParam as number,
        }),
      initialPageParam: DEFAULT_THREAD_OFFSET,
      getNextPageParam: (lastPage: ThreadPage, allPages: ThreadPage[]) =>
        lastPage.hasMore ? getNextThreadHistoryOffset(allPages) : undefined,
      staleTime: 2 * 60 * 1000,
    });
  };
}

export type {
  Message,
  MessageRequest,
  ReactionGroup,
  Thread,
  ThreadData,
  ThreadPage,
};
