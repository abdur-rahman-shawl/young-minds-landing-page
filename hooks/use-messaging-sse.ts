'use client';

import { useEffect, useRef } from 'react';
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

/**
 * Hook for Server-Sent Events integration with intelligent cache updates
 * Automatically updates React Query cache when real-time events occur
 */
export function useMessagingSSE(userId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!userId || !enabled) return;

    const connectSSE = () => {
      try {
        const eventSource = new EventSource(`/api/messaging/sse?userId=${userId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[SSE] Connection established');
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts
        };

        // Handle new messages
        eventSource.addEventListener('message', (event) => {
          try {
            const data: SSEMessage = JSON.parse(event.data);
            
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
          } catch (error) {
            console.error('[SSE] Failed to process message event:', error);
          }
        });

        // Handle message requests
        eventSource.addEventListener('request', (event) => {
          try {
            const data: SSERequest = JSON.parse(event.data);
            
            switch (data.type) {
              case 'new_request':
                handleNewRequest(data.data);
                break;
              case 'request_accepted':
                handleRequestAccepted(data.data);
                break;
              case 'request_rejected':
                handleRequestRejected(data.data);
                break;
            }
          } catch (error) {
            console.error('[SSE] Failed to process request event:', error);
          }
        });

        // Handle errors with exponential backoff
        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          eventSource.close();
          
          // Exponential backoff for reconnection
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`[SSE] Reconnecting in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, backoffDelay);
        };

      } catch (error) {
        console.error('[SSE] Failed to establish connection:', error);
      }
    };

    // Handler functions with smart cache updates
    const handleNewMessage = (message: any) => {
      // Update thread cache with new message
      queryClient.setQueryData(
        messagingKeys.thread(message.threadId, userId),
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            messages: [...oldData.messages, message],
          };
        }
      );

      // Update threads list to reflect new message
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
                  lastMessagePreview: message.content.substring(0, 100),
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

      // Show notification if user is not on the thread page
      if (!window.location.pathname.includes(message.threadId)) {
        toast.info('New message received', {
          description: message.content.substring(0, 50) + '...',
        });
      }
    };

    const handleMessageRead = (data: { threadId: string; userId: string }) => {
      // Update thread unread count
      queryClient.setQueryData(
        messagingKeys.threads(userId),
        (oldThreads: any[]) => {
          if (!oldThreads) return oldThreads;
          
          return oldThreads.map(thread => {
            if (thread.thread.id === data.threadId) {
              return {
                ...thread,
                unreadCount: 0,
              };
            }
            return thread;
          });
        }
      );

      // Update messages read status
      queryClient.setQueryData(
        messagingKeys.thread(data.threadId, userId),
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            messages: oldData.messages.map((msg: any) => ({
              ...msg,
              message: {
                ...msg.message,
                isRead: msg.message.receiverId === data.userId ? true : msg.message.isRead,
                status: msg.message.receiverId === data.userId ? 'read' : msg.message.status,
              },
            })),
          };
        }
      );
    };

    const handleMessageEdited = (editedMessage: any) => {
      // Update message in thread cache
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
      // Remove message from thread cache
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

    const handleNewRequest = (request: any) => {
      // Add to requests cache
      queryClient.setQueryData(
        messagingKeys.requests(userId, 'received', 'pending'),
        (oldRequests: any[]) => {
          if (!oldRequests) return [request];
          return [request, ...oldRequests];
        }
      );

      toast.info('New message request', {
        description: `From ${request.requester.name}`,
      });
    };

    const handleRequestAccepted = (data: any) => {
      // Remove from pending requests
      queryClient.setQueryData(
        messagingKeys.requests(userId, 'sent', 'pending'),
        (oldRequests: any[]) => {
          if (!oldRequests) return oldRequests;
          return oldRequests.filter(req => req.request.id !== data.requestId);
        }
      );

      // Invalidate threads to show new conversation
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threads(userId),
      });

      toast.success('Your message request was accepted!');
    };

    const handleRequestRejected = (data: any) => {
      // Update request status in cache
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

    // Start connection
    connectSSE();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [userId, enabled, queryClient]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}