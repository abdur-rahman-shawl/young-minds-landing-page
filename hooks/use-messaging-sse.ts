'use client';

import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { messagingKeys } from './queries/use-messaging-queries';
import { toast } from 'sonner';

interface SSEMessage {
  type: 'new_message' | 'message_read' | 'message_edited' | 'message_deleted';
  data: any;
  timestamp: string;
}

interface SSERequest {
  type: 'new_request' | 'request_accepted' | 'request_rejected';
  data: any;
  timestamp: string;
}

// Singleton connection manager - ensures only ONE SSE connection per user
class SSEConnectionManager {
  private static instance: SSEConnectionManager;
  private eventSource: EventSource | null = null;
  private userId: string | null = null;
  private messageSubscribers = new Set<(data: SSEMessage) => void>();
  private requestSubscribers = new Set<(data: SSERequest) => void>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private connectionCount = 0;

  static getInstance(): SSEConnectionManager {
    if (!SSEConnectionManager.instance) {
      SSEConnectionManager.instance = new SSEConnectionManager();
    }
    return SSEConnectionManager.instance;
  }

  connect(userId: string) {
    this.connectionCount++;

    // If already connected with same userId, just return
    if (this.eventSource && this.userId === userId &&
      this.eventSource.readyState !== EventSource.CLOSED) {
      console.log('[SSE Singleton] Reusing existing connection');
      return;
    }

    // Close existing connection if userId changed
    if (this.eventSource && this.userId !== userId) {
      this.forceDisconnect();
    }

    this.userId = userId;
    this.createConnection();
  }

  private createConnection() {
    if (!this.userId) return;

    try {
      console.log('[SSE Singleton] Creating new connection');
      this.eventSource = new EventSource(`/api/messaging/sse?userId=${this.userId}`);

      this.eventSource.onopen = () => {
        console.log('[SSE Singleton] Connection established');
        this.reconnectAttempts = 0;
      };

      this.eventSource.addEventListener('message', (event: MessageEvent) => {
        try {
          const data: SSEMessage = JSON.parse(event.data);
          this.messageSubscribers.forEach(callback => callback(data));
        } catch (error) {
          console.error('[SSE Singleton] Failed to parse message:', error);
        }
      });

      this.eventSource.addEventListener('request', (event: MessageEvent) => {
        try {
          const data: SSERequest = JSON.parse(event.data);
          this.requestSubscribers.forEach(callback => callback(data));
        } catch (error) {
          console.error('[SSE Singleton] Failed to parse request:', error);
        }
      });

      this.eventSource.addEventListener('ping', () => {
        // Keep alive
      });

      this.eventSource.onerror = () => {
        console.log('[SSE Singleton] Connection error, reconnecting...');
        this.eventSource?.close();

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
          if (this.connectionCount > 0) {
            this.createConnection();
          }
        }, delay);
      };
    } catch (error) {
      console.error('[SSE Singleton] Failed to connect:', error);
    }
  }

  disconnect() {
    this.connectionCount--;

    // Only actually close if no more subscribers
    if (this.connectionCount <= 0) {
      this.forceDisconnect();
    }
  }

  private forceDisconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      console.log('[SSE Singleton] Closing connection');
      this.eventSource.close();
      this.eventSource = null;
    }
    this.userId = null;
    this.reconnectAttempts = 0;
    this.connectionCount = 0;
  }

  subscribe(
    onMessage: (data: SSEMessage) => void,
    onRequest: (data: SSERequest) => void
  ) {
    this.messageSubscribers.add(onMessage);
    this.requestSubscribers.add(onRequest);

    return () => {
      this.messageSubscribers.delete(onMessage);
      this.requestSubscribers.delete(onRequest);
    };
  }

  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

/**
 * Hook for Server-Sent Events integration with intelligent cache updates
 * Uses singleton pattern to ensure only ONE connection per user across all components
 */
export function useMessagingSSE(userId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Message event handler
  const handleMessage = useCallback((data: SSEMessage) => {
    switch (data.type) {
      case 'new_message':
        handleNewMessage(data.data);
        break;
      case 'message_read':
        handleMessageRead(data.data);
        break;
      case 'message_edited':
        handleMessageEdited(data.data);
        break;
      case 'message_deleted':
        handleMessageDeleted(data.data);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Request event handler
  const handleRequest = useCallback((data: SSERequest) => {
    switch (data.type) {
      case 'new_request':
        handleNewRequestEvent(data.data);
        break;
      case 'request_accepted':
        handleRequestAccepted(data.data);
        break;
      case 'request_rejected':
        handleRequestRejected(data.data);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Handler implementations
  const handleNewMessage = (message: any) => {
    if (!userId) return;

    // Update thread cache with new message
    queryClient.setQueryData(
      messagingKeys.thread(message.threadId, userId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          messages: [...oldData.messages, { message, sender: null }],
        };
      }
    );

    // Update threads list
    queryClient.setQueryData(
      messagingKeys.threads(userId),
      (oldThreads: any[]) => {
        if (!oldThreads) return oldThreads;
        return oldThreads.map(thread => {
          if (thread.thread.id === message.threadId) {
            return {
              ...thread,
              thread: {
                ...thread.thread,
                lastMessageAt: message.createdAt,
                lastMessagePreview: message.content?.substring(0, 100),
              },
              unreadCount: message.receiverId === userId
                ? thread.unreadCount + 1
                : thread.unreadCount,
            };
          }
          return thread;
        });
      }
    );

    // Show notification if not on thread
    if (!window.location.pathname.includes(message.threadId)) {
      toast.info('New message received', {
        description: message.content?.substring(0, 50) + '...',
      });
    }
  };

  const handleMessageRead = (data: { threadId: string; userId: string }) => {
    if (!userId) return;

    queryClient.setQueryData(
      messagingKeys.threads(userId),
      (oldThreads: any[]) => {
        if (!oldThreads) return oldThreads;
        return oldThreads.map(thread => {
          if (thread.thread.id === data.threadId) {
            return { ...thread, unreadCount: 0 };
          }
          return thread;
        });
      }
    );
  };

  const handleMessageEdited = (editedMessage: any) => {
    if (!userId) return;

    queryClient.setQueryData(
      messagingKeys.thread(editedMessage.threadId, userId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          messages: oldData.messages.map((msg: any) =>
            msg.message.id === editedMessage.id
              ? { ...msg, message: editedMessage }
              : msg
          ),
        };
      }
    );
  };

  const handleMessageDeleted = (deletedMessage: any) => {
    if (!userId) return;

    queryClient.setQueryData(
      messagingKeys.thread(deletedMessage.threadId, userId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          messages: oldData.messages.filter(
            (msg: any) => msg.message.id !== deletedMessage.id
          ),
        };
      }
    );
  };

  const handleNewRequestEvent = (request: any) => {
    if (!userId) return;

    queryClient.setQueryData(
      messagingKeys.requests(userId, 'received', 'pending'),
      (oldRequests: any[]) => {
        if (!oldRequests) return [request];
        return [request, ...oldRequests];
      }
    );
    toast.info('New message request', {
      description: `From ${request.requester?.name || 'someone'}`,
    });
  };

  const handleRequestAccepted = (data: any) => {
    if (!userId) return;

    queryClient.setQueryData(
      messagingKeys.requests(userId, 'sent', 'pending'),
      (oldRequests: any[]) => {
        if (!oldRequests) return oldRequests;
        return oldRequests.filter(req => req.request.id !== data.requestId);
      }
    );
    queryClient.invalidateQueries({
      queryKey: messagingKeys.threads(userId),
    });
    toast.success('Your message request was accepted!');
  };

  const handleRequestRejected = (data: any) => {
    if (!userId) return;

    queryClient.setQueryData(
      messagingKeys.requests(userId, 'sent', 'pending'),
      (oldRequests: any[]) => {
        if (!oldRequests) return oldRequests;
        return oldRequests.map(req =>
          req.request.id === data.requestId
            ? { ...req, request: { ...req.request, status: 'rejected' } }
            : req
        );
      }
    );
    toast.info('Your message request was declined');
  };

  useEffect(() => {
    if (!userId || !enabled) return;

    const manager = SSEConnectionManager.getInstance();
    manager.connect(userId);

    const unsubscribe = manager.subscribe(handleMessage, handleRequest);

    // Poll connection status
    const statusInterval = setInterval(() => {
      setIsConnected(manager.isConnected);
    }, 1000);

    return () => {
      unsubscribe();
      manager.disconnect();
      clearInterval(statusInterval);
    };
  }, [userId, enabled, handleMessage, handleRequest]);

  return {
    isConnected,
  };
}