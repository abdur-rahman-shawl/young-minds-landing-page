'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';

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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const data = await res.json();
  return data.data;
};

export function useMessaging(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch threads
  const { data: threads, error: threadsError, isLoading: threadsLoading } = useSWR<Thread[]>(
    userId ? `/api/messaging/threads?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Fetch message requests
  const { data: requests, error: requestsError, isLoading: requestsLoading } = useSWR<MessageRequest[]>(
    userId ? `/api/messaging/requests?userId=${userId}&type=received&status=pending` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  // Calculate unread counts
  const unreadThreadsCount = threads?.reduce((acc, thread) => acc + thread.unreadCount, 0) || 0;
  const pendingRequestsCount = requests?.length || 0;
  const totalUnreadCount = unreadThreadsCount + pendingRequestsCount;

  // Setup SSE connection
  useEffect(() => {
    if (!userId) return;

    const connectSSE = () => {
      try {
        const eventSource = new EventSource(`/api/messaging/sse?userId=${userId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          console.log('SSE connection established');
        };

        eventSource.addEventListener('connection', (event) => {
          console.log('Connected to messaging service');
        });

        eventSource.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_message') {
            // Revalidate threads to show new message
            mutate(`/api/messaging/threads?userId=${userId}`);
            
            // Show notification if not on the thread page
            if (!window.location.pathname.includes(data.data.threadId)) {
              toast.info('New message received');
            }
          }
        });

        eventSource.addEventListener('request', (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_request') {
            // Revalidate requests
            mutate(`/api/messaging/requests?userId=${userId}&type=received&status=pending`);
            toast.info('New message request received');
          }
        });

        eventSource.addEventListener('notification', (event) => {
          const data = JSON.parse(event.data);
          // Handle other notifications if needed
        });

        eventSource.addEventListener('ping', () => {
          // Keep connection alive
        });

        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          setIsConnected(false);
          eventSource.close();
          
          // Retry connection after 5 seconds
          setTimeout(() => {
            connectSSE();
          }, 5000);
        };

        return eventSource;
      } catch (error) {
        console.error('Failed to establish SSE connection:', error);
        setIsConnected(false);
      }
    };

    const eventSource = connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [userId]);

  // Send message
  const sendMessage = useCallback(async (threadId: string, content: string, replyToId?: string) => {
    if (!userId) throw new Error('User not authenticated');

    const response = await fetch(`/api/messaging/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content, replyToId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    const result = await response.json();
    
    // Revalidate thread messages
    mutate(`/api/messaging/threads/${threadId}?userId=${userId}`);
    mutate(`/api/messaging/threads?userId=${userId}`);
    
    return result.data;
  }, [userId]);

  // Send message request
  const sendRequest = useCallback(async (
    recipientId: string,
    initialMessage: string,
    requestType: 'mentor_to_mentee' | 'mentee_to_mentor',
    requestReason?: string
  ) => {
    if (!userId) throw new Error('User not authenticated');

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

    const result = await response.json();
    
    // Revalidate requests
    mutate(`/api/messaging/requests?userId=${userId}&type=sent&status=pending`);
    
    return result.data;
  }, [userId]);

  // Handle request action
  const handleRequest = useCallback(async (
    requestId: string,
    action: 'accept' | 'reject',
    responseMessage?: string
  ) => {
    if (!userId) throw new Error('User not authenticated');

    const response = await fetch(`/api/messaging/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, responseMessage }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process request');
    }

    const result = await response.json();
    
    // Revalidate requests and threads
    mutate(`/api/messaging/requests?userId=${userId}&type=received&status=pending`);
    if (action === 'accept') {
      mutate(`/api/messaging/threads?userId=${userId}`);
    }
    
    return result.data;
  }, [userId]);

  // Mark thread as read
  const markThreadAsRead = useCallback(async (threadId: string) => {
    if (!userId) throw new Error('User not authenticated');

    const response = await fetch(`/api/messaging/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'markAsRead' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark as read');
    }

    // Revalidate threads
    mutate(`/api/messaging/threads?userId=${userId}`);
  }, [userId]);

  // Archive thread
  const archiveThread = useCallback(async (threadId: string) => {
    if (!userId) throw new Error('User not authenticated');

    const response = await fetch(`/api/messaging/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'archive' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to archive thread');
    }

    // Revalidate threads
    mutate(`/api/messaging/threads?userId=${userId}`);
    toast.success('Conversation archived');
  }, [userId]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!userId) throw new Error('User not authenticated');

    const response = await fetch(`/api/messaging/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content: newContent }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to edit message');
    }

    const result = await response.json();
    
    // Revalidate messages in the thread
    if (result.data.threadId) {
      mutate(`/api/messaging/threads/${result.data.threadId}?userId=${userId}`);
    }
    
    return result.data;
  }, [userId]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!userId) throw new Error('User not authenticated');

    const response = await fetch(`/api/messaging/messages/${messageId}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete message');
    }

    const result = await response.json();
    
    // Revalidate messages in the thread
    if (result.data.threadId) {
      mutate(`/api/messaging/threads/${result.data.threadId}?userId=${userId}`);
    }
    
    return result.data;
  }, [userId]);

  return {
    threads: threads || [],
    requests: requests || [],
    threadsLoading,
    requestsLoading,
    threadsError,
    requestsError,
    unreadThreadsCount,
    pendingRequestsCount,
    totalUnreadCount,
    isConnected,
    sendMessage,
    sendRequest,
    handleRequest,
    markThreadAsRead,
    archiveThread,
    editMessage,
    deleteMessage,
  };
}

export function useThread(threadId: string | null, userId: string | undefined) {
  const { data, error, isLoading } = useSWR<{
    thread: any;
    messages: Message[];
    otherUser: any;
    totalMessages: number;
    hasMore: boolean;
  }>(
    threadId && userId ? `/api/messaging/threads/${threadId}?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    thread: data?.thread,
    messages: data?.messages || [],
    otherUser: data?.otherUser,
    totalMessages: data?.totalMessages || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
  };
}