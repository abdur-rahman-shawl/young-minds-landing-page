import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
interface Thread {
  thread: {
    id: string;
    participant1Id: string;
    participant2Id: string;
    status: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    totalMessages: number;
    createdAt: string;
    updatedAt: string;
  };
  otherUser: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
}

interface Message {
  message: {
    id: string;
    threadId: string;
    senderId: string;
    receiverId: string;
    content: string;
    messageType: string;
    status: string;
    isRead: boolean;
    isDelivered: boolean;
    createdAt: string;
    updatedAt: string;
  };
  sender: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
}

interface MessageRequest {
  request: {
    id: string;
    requesterId: string;
    recipientId: string;
    requestType: string;
    status: string;
    initialMessage: string;
    requestReason?: string;
    maxMessages: number;
    messagesUsed: number;
    createdAt: string;
    expiresAt: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface ThreadData {
  thread: any;
  messages: Message[];
  otherUser: any;
  totalMessages: number;
  hasMore: boolean;
}

// Query keys factory
export const messagingKeys = {
  all: ['messaging'] as const,
  threads: (userId: string) => ['messaging', 'threads', userId] as const,
  thread: (threadId: string, userId: string) => ['messaging', 'thread', threadId, userId] as const,
  requests: (userId: string, type?: string, status?: string) => 
    ['messaging', 'requests', userId, { type, status }] as const,
  unreadCount: (userId: string) => ['messaging', 'unread', userId] as const,
};

// Fetcher functions
const fetchThreads = async (userId: string): Promise<Thread[]> => {
  const response = await fetch(`/api/messaging/threads?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch threads');
  const data = await response.json();
  return data.data || [];
};

const fetchThread = async (threadId: string, userId: string): Promise<ThreadData> => {
  const response = await fetch(`/api/messaging/threads/${threadId}?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch thread');
  const data = await response.json();
  return data.data;
};

const fetchRequests = async (
  userId: string, 
  type: string = 'received', 
  status: string = 'pending'
): Promise<MessageRequest[]> => {
  const response = await fetch(
    `/api/messaging/requests?userId=${userId}&type=${type}&status=${status}`
  );
  if (!response.ok) throw new Error('Failed to fetch requests');
  const data = await response.json();
  return data.data || [];
};

// Query Hooks

/**
 * Fetch all message threads for a user
 */
export function useThreadsQuery(userId: string | undefined, includeArchived = false) {
  return useQuery({
    queryKey: messagingKeys.threads(userId!),
    queryFn: () => fetchThreads(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time feel
  });
}

/**
 * Fetch a specific thread with messages
 */
export function useThreadQuery(threadId: string | null, userId: string | undefined) {
  return useQuery({
    queryKey: messagingKeys.thread(threadId!, userId!),
    queryFn: () => fetchThread(threadId!, userId!),
    enabled: !!threadId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time messages
  });
}

/**
 * Fetch message requests
 */
export function useMessageRequestsQuery(
  userId: string | undefined,
  type: 'sent' | 'received' = 'received',
  status: string = 'pending'
) {
  return useQuery({
    queryKey: messagingKeys.requests(userId!, type, status),
    queryFn: () => fetchRequests(userId!, type, status),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Calculate unread counts from cached data
 */
export function useUnreadCountQuery(userId: string | undefined) {
  const { data: threads } = useThreadsQuery(userId);
  const { data: requests } = useMessageRequestsQuery(userId, 'received', 'pending');

  const unreadThreadsCount = threads?.reduce((acc, thread) => acc + thread.unreadCount, 0) || 0;
  const pendingRequestsCount = requests?.length || 0;
  const totalUnreadCount = unreadThreadsCount + pendingRequestsCount;

  return {
    unreadThreadsCount,
    pendingRequestsCount,
    totalUnreadCount,
  };
}

// Mutation Hooks

/**
 * Send a message with optimistic updates
 */
export function useSendMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      threadId, 
      userId, 
      content 
    }: { 
      threadId: string; 
      userId: string; 
      content: string;
    }) => {
      const response = await fetch(`/api/messaging/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return response.json();
    },
    onMutate: async ({ threadId, userId, content }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: messagingKeys.thread(threadId, userId) 
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<ThreadData>(
        messagingKeys.thread(threadId, userId)
      );

      // Optimistically update the thread
      if (previousData) {
        const optimisticMessage: Message = {
          message: {
            id: `temp-${Date.now()}`,
            threadId,
            senderId: userId,
            receiverId: previousData.otherUser?.id || '',
            content,
            messageType: 'text',
            status: 'sending',
            isRead: false,
            isDelivered: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          sender: null, // Will be populated by server
        };

        queryClient.setQueryData<ThreadData>(
          messagingKeys.thread(threadId, userId),
          {
            ...previousData,
            messages: [...previousData.messages, optimisticMessage],
          }
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(
          messagingKeys.thread(variables.threadId, variables.userId),
          context.previousData
        );
      }
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.thread(variables.threadId, variables.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.threads(variables.userId) 
      });
    },
  });
}

/**
 * Handle message request (accept/reject)
 */
export function useHandleRequestMutation() {
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
    }) => {
      const response = await fetch(`/api/messaging/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, responseMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process request');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate requests
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.requests(variables.userId, 'received', 'pending') 
      });
      
      // If accepted, invalidate threads to show new conversation
      if (variables.action === 'accept') {
        queryClient.invalidateQueries({ 
          queryKey: messagingKeys.threads(variables.userId) 
        });
      }

      const actionText = variables.action === 'accept' ? 'accepted' : 
                        variables.action === 'reject' ? 'rejected' : 'cancelled';
      toast.success(`Request ${actionText} successfully`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to process request');
    },
  });
}

/**
 * Send a new message request
 */
export function useSendRequestMutation() {
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
    }) => {
      const response = await fetch('/api/messaging/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          recipientId,
          initialMessage,
          requestType,
          requestReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send request');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate sent requests
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.requests(variables.userId, 'sent', 'pending') 
      });
      toast.success('Message request sent successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to send request');
    },
  });
}

/**
 * Archive a thread
 */
export function useArchiveThreadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, userId }: { threadId: string; userId: string }) => {
      const response = await fetch(`/api/messaging/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'archive' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive thread');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate threads list
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.threads(variables.userId) 
      });
      toast.success('Conversation archived');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to archive thread');
    },
  });
}

/**
 * Mark thread as read
 */
export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, userId }: { threadId: string; userId: string }) => {
      const response = await fetch(`/api/messaging/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'markAsRead' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as read');
      }

      return response.json();
    },
    onMutate: async ({ threadId, userId }) => {
      // Optimistically update unread count
      await queryClient.cancelQueries({ 
        queryKey: messagingKeys.threads(userId) 
      });

      const previousThreads = queryClient.getQueryData<Thread[]>(
        messagingKeys.threads(userId)
      );

      if (previousThreads) {
        queryClient.setQueryData<Thread[]>(
          messagingKeys.threads(userId),
          previousThreads.map(thread => 
            thread.thread.id === threadId 
              ? { ...thread, unreadCount: 0 }
              : thread
          )
        );
      }

      return { previousThreads };
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousThreads) {
        queryClient.setQueryData(
          messagingKeys.threads(variables.userId),
          context.previousThreads
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.threads(variables.userId) 
      });
    },
  });
}

/**
 * Prefetch a thread (for hover effects)
 */
export function usePrefetchThread() {
  const queryClient = useQueryClient();

  return (threadId: string, userId: string) => {
    queryClient.prefetchQuery({
      queryKey: messagingKeys.thread(threadId, userId),
      queryFn: () => fetchThread(threadId, userId),
      staleTime: 2 * 60 * 1000,
    });
  };
}