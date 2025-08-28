'use client';

import {
  useThreadsQuery,
  useMessageRequestsQuery,
  useUnreadCountQuery,
  useSendMessageMutation,
  useHandleRequestMutation,
  useSendRequestMutation,
  useArchiveThreadMutation,
  useMarkAsReadMutation,
  usePrefetchThread,
} from './queries/use-messaging-queries';
import { useMessagingSSE } from './use-messaging-sse';

/**
 * Enhanced messaging hook with TanStack Query caching
 * Provides all messaging functionality with optimized performance
 */
export function useMessaging(userId: string | undefined) {
  // Use the dedicated SSE hook for real-time updates
  const { isConnected } = useMessagingSSE(userId);

  // Fetch data using React Query hooks
  const { 
    data: threads = [], 
    isLoading: threadsLoading,
    error: threadsError 
  } = useThreadsQuery(userId);

  const { 
    data: requests = [], 
    isLoading: requestsLoading,
    error: requestsError 
  } = useMessageRequestsQuery(userId, 'received', 'pending');

  // Get unread counts from cached data
  const {
    unreadThreadsCount,
    pendingRequestsCount,
    totalUnreadCount,
  } = useUnreadCountQuery(userId);

  // Mutations
  const sendMessageMutation = useSendMessageMutation();
  const handleRequestMutation = useHandleRequestMutation();
  const sendRequestMutation = useSendRequestMutation();
  const archiveThreadMutation = useArchiveThreadMutation();
  const markAsReadMutation = useMarkAsReadMutation();

  // Prefetch hook for hover effects
  const prefetchThread = usePrefetchThread();

  // Wrapper functions that use mutations
  const sendMessage = async (threadId: string, content: string) => {
    if (!userId) throw new Error('User not authenticated');
    return sendMessageMutation.mutateAsync({ threadId, userId, content });
  };

  const sendRequest = async (
    recipientId: string,
    initialMessage: string,
    requestType: 'mentor_to_mentee' | 'mentee_to_mentor',
    requestReason?: string
  ) => {
    if (!userId) throw new Error('User not authenticated');
    return sendRequestMutation.mutateAsync({
      userId,
      recipientId,
      initialMessage,
      requestType,
      requestReason,
    });
  };

  const handleRequest = async (
    requestId: string,
    action: 'accept' | 'reject' | 'cancel',
    responseMessage?: string
  ) => {
    if (!userId) throw new Error('User not authenticated');
    return handleRequestMutation.mutateAsync({
      requestId,
      userId,
      action,
      responseMessage,
    });
  };

  const markThreadAsRead = async (threadId: string) => {
    if (!userId) throw new Error('User not authenticated');
    return markAsReadMutation.mutateAsync({ threadId, userId });
  };

  const archiveThread = async (threadId: string) => {
    if (!userId) throw new Error('User not authenticated');
    return archiveThreadMutation.mutateAsync({ threadId, userId });
  };

  return {
    // Data
    threads,
    requests,
    threadsLoading,
    requestsLoading,
    threadsError,
    requestsError,
    
    // Counts
    unreadThreadsCount,
    pendingRequestsCount,
    totalUnreadCount,
    
    // Connection status
    isConnected,
    
    // Actions
    sendMessage,
    sendRequest,
    handleRequest,
    markThreadAsRead,
    archiveThread,
    
    // Mutation states
    isSendingMessage: sendMessageMutation.isPending,
    isHandlingRequest: handleRequestMutation.isPending,
    isSendingRequest: sendRequestMutation.isPending,
    
    // Prefetching
    prefetchThread,
  };
}

/**
 * Hook for individual thread with messages
 * Uses React Query for caching and automatic updates
 */
export { useThreadQuery as useThread } from './queries/use-messaging-queries';