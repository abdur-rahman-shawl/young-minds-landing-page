import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  messages,
  messageRequests,
  notifications,
} from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { auth } from '@/lib/auth';

const activeConnections = new Map<string, { 
  controller: ReadableStreamDefaultController;
  lastEventId: string;
  userId: string;
}>();

function createSSEMessage(data: any, eventType: string = 'message', id?: string) {
  const lines = [
    `event: ${eventType}`,
    `data: ${JSON.stringify(data)}`,
    id ? `id: ${id}` : '',
    '',
    ''
  ].filter(Boolean);
  
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providedLastEventId = searchParams.get('lastEventId');

  const session = await auth.api.getSession({ headers: request.headers });

  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const lastEventId = providedLastEventId && !isNaN(Date.parse(providedLastEventId))
    ? providedLastEventId
    : new Date().toISOString();

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      activeConnections.set(userId, {
        controller,
        lastEventId,
        userId
      });

      controller.enqueue(encoder.encode(createSSEMessage({ 
        type: 'connected',
        timestamp: new Date().toISOString() 
      }, 'connection')));

      const sendPendingUpdates = async () => {
        try {
          const connection = activeConnections.get(userId);
          if (!connection) return;

          const newMessages = await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.receiverId, userId),
                gt(messages.createdAt, new Date(connection.lastEventId))
              )
            )
            .orderBy(messages.createdAt);

          for (const message of newMessages) {
            const eventData = {
              type: 'new_message',
              data: message,
              timestamp: message.createdAt.toISOString()
            };
            const eventId = message.createdAt
              ? message.createdAt.toISOString()
              : new Date().toISOString();
            
            controller.enqueue(
              encoder.encode(
                createSSEMessage(eventData, 'message', eventId)
              )
            );
            
            connection.lastEventId = eventId;
          }

          // Note: Message reactions feature can be added here later if needed

          const newRequests = await db
            .select()
            .from(messageRequests)
            .where(
              and(
                eq(messageRequests.recipientId, userId),
                eq(messageRequests.status, 'pending'),
                gt(messageRequests.createdAt, new Date(connection.lastEventId))
              )
            )
            .orderBy(messageRequests.createdAt);

          for (const request of newRequests) {
            const eventData = {
              type: 'new_request',
              data: request,
              timestamp: request.createdAt.toISOString()
            };
            const eventId = request.createdAt
              ? request.createdAt.toISOString()
              : new Date().toISOString();
            
            controller.enqueue(
              encoder.encode(
                createSSEMessage(eventData, 'request', eventId)
              )
            );
            connection.lastEventId = eventId;
          }

          const newNotifications = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, userId),
                eq(notifications.isRead, false),
                gt(notifications.createdAt, new Date(connection.lastEventId))
              )
            )
            .orderBy(notifications.createdAt);

          for (const notification of newNotifications) {
            const eventData = {
              type: 'notification',
              data: notification,
              timestamp: notification.createdAt.toISOString()
            };
            const eventId = notification.createdAt
              ? notification.createdAt.toISOString()
              : new Date().toISOString();
            
            controller.enqueue(
              encoder.encode(
                createSSEMessage(eventData, 'notification', eventId)
              )
            );
            connection.lastEventId = eventId;
          }

        } catch (error) {
          console.error('Error sending pending updates:', error);
        }
      };

      await sendPendingUpdates();

      const pingInterval = setInterval(() => {
        const connection = activeConnections.get(userId);
        if (!connection) {
          clearInterval(pingInterval);
          return;
        }
        
        try {
          controller.enqueue(
            encoder.encode(createSSEMessage({ 
              type: 'ping',
              timestamp: new Date().toISOString() 
            }, 'ping'))
          );
        } catch (error) {
          console.error('Error sending ping:', error);
          clearInterval(pingInterval);
          activeConnections.delete(userId);
        }
      }, 30000);

      const updateInterval = setInterval(async () => {
        await sendPendingUpdates();
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        clearInterval(updateInterval);
        activeConnections.delete(userId);
        controller.close();
      });
    },

    cancel() {
      activeConnections.delete(userId);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function broadcastToUser(userId: string, data: any, eventType: string = 'message') {
  const connection = activeConnections.get(userId);
  if (!connection) return;

  try {
    const encoder = new TextEncoder();
    const eventId = new Date().toISOString();
    
    connection.controller.enqueue(
      encoder.encode(
        createSSEMessage(data, eventType, eventId)
      )
    );
    
    connection.lastEventId = eventId;
  } catch (error) {
    console.error('Error broadcasting to user:', error);
    activeConnections.delete(userId);
  }
}
