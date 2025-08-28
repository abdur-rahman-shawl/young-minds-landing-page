import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  messageRequests, 
  messagingPermissions,
  messageThreads,
  messages,
  notifications,
  users
} from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

const responseSchema = z.object({
  action: z.enum(['accept', 'reject', 'cancel']),
  responseMessage: z.string().optional(),
  userId: z.string().min(1)
});

async function createMessagingPermission(requesterId: string, recipientId: string, requestId: string) {
  const existingPermission = await db
    .select()
    .from(messagingPermissions)
    .where(
      and(
        or(
          and(
            eq(messagingPermissions.userId, requesterId),
            eq(messagingPermissions.allowedUserId, recipientId)
          ),
          and(
            eq(messagingPermissions.userId, recipientId),
            eq(messagingPermissions.allowedUserId, requesterId)
          )
        ),
        eq(messagingPermissions.status, 'active')
      )
    )
    .limit(1);

  if (existingPermission.length > 0) {
    return existingPermission[0];
  }

  const [permission1] = await db
    .insert(messagingPermissions)
    .values({
      userId: requesterId,
      allowedUserId: recipientId,
      grantedViaRequestId: requestId,
      status: 'active'
    })
    .returning();

  const [permission2] = await db
    .insert(messagingPermissions)
    .values({
      userId: recipientId,
      allowedUserId: requesterId,
      grantedViaRequestId: requestId,
      status: 'active'
    })
    .returning();

  return permission1;
}

async function createMessageThread(user1Id: string, user2Id: string) {
  const existingThread = await db
    .select()
    .from(messageThreads)
    .where(
      or(
        and(
          eq(messageThreads.participant1Id, user1Id),
          eq(messageThreads.participant2Id, user2Id)
        ),
        and(
          eq(messageThreads.participant1Id, user2Id),
          eq(messageThreads.participant2Id, user1Id)
        )
      )
    )
    .limit(1);

  if (existingThread.length > 0) {
    return existingThread[0];
  }

  const [participant1Id, participant2Id] = [user1Id, user2Id].sort();

  const [newThread] = await db
    .insert(messageThreads)
    .values({
      participant1Id,
      participant2Id,
      status: 'active'
    })
    .returning();

  return newThread;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    const messageRequest = await db
      .select({
        request: messageRequests,
        requester: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image
        }
      })
      .from(messageRequests)
      .leftJoin(users, eq(messageRequests.requesterId, users.id))
      .where(eq(messageRequests.id, requestId))
      .limit(1);

    if (messageRequest.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: messageRequest[0]
    });
  } catch (error) {
    console.error('Error fetching message request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    const validatedData = responseSchema.parse(body);

    const [messageRequest] = await db
      .select()
      .from(messageRequests)
      .where(eq(messageRequests.id, requestId))
      .limit(1);

    if (!messageRequest) {
      return NextResponse.json(
        { success: false, error: 'Message request not found' },
        { status: 404 }
      );
    }

    if (messageRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    const isRecipient = messageRequest.recipientId === validatedData.userId;
    const isRequester = messageRequest.requesterId === validatedData.userId;

    if (validatedData.action === 'cancel') {
      if (!isRequester) {
        return NextResponse.json(
          { success: false, error: 'Only the requester can cancel' },
          { status: 403 }
        );
      }

      await db
        .update(messageRequests)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(messageRequests.id, requestId));

      return NextResponse.json({
        success: true,
        message: 'Request cancelled successfully'
      });
    }

    if (!isRecipient) {
      return NextResponse.json(
        { success: false, error: 'Only the recipient can accept or reject' },
        { status: 403 }
      );
    }

    if (validatedData.action === 'accept') {
      const permission = await createMessagingPermission(
        messageRequest.requesterId,
        messageRequest.recipientId,
        requestId
      );

      const thread = await createMessageThread(
        messageRequest.requesterId,
        messageRequest.recipientId
      );

      await db
        .update(messageRequests)
        .set({
          status: 'accepted',
          respondedAt: new Date(),
          responseMessage: validatedData.responseMessage,
          updatedAt: new Date()
        })
        .where(eq(messageRequests.id, requestId));

      const [initialMessage] = await db
        .insert(messages)
        .values({
          threadId: thread.id,
          senderId: messageRequest.requesterId,
          receiverId: messageRequest.recipientId,
          content: messageRequest.initialMessage,
          messageType: 'text',
          status: 'sent'
        })
        .returning();

      await db
        .update(messageThreads)
        .set({
          lastMessageId: initialMessage.id,
          lastMessageAt: initialMessage.createdAt,
          lastMessagePreview: initialMessage.content.substring(0, 100),
          participant2UnreadCount: thread.participant2Id === messageRequest.recipientId ? 1 : 0,
          participant1UnreadCount: thread.participant1Id === messageRequest.recipientId ? 1 : 0,
          totalMessages: 1,
          updatedAt: new Date()
        })
        .where(eq(messageThreads.id, thread.id));

      const requester = await db
        .select()
        .from(users)
        .where(eq(users.id, messageRequest.requesterId))
        .limit(1);

      const recipient = await db
        .select()
        .from(users)
        .where(eq(users.id, messageRequest.recipientId))
        .limit(1);

      if (requester.length > 0) {
        await db
          .insert(notifications)
          .values({
            userId: messageRequest.requesterId,
            type: 'MESSAGE_RECEIVED',
            title: 'Message Request Accepted',
            message: `${recipient[0]?.name || 'User'} accepted your message request`,
            relatedId: thread.id,
            relatedType: 'thread',
            actionUrl: `/dashboard/messages/${thread.id}`,
            actionText: 'Open Conversation'
          });
      }

      return NextResponse.json({
        success: true,
        data: {
          permission,
          thread,
          message: initialMessage
        },
        message: 'Request accepted successfully'
      });
    } else if (validatedData.action === 'reject') {
      await db
        .update(messageRequests)
        .set({
          status: 'rejected',
          respondedAt: new Date(),
          responseMessage: validatedData.responseMessage,
          updatedAt: new Date()
        })
        .where(eq(messageRequests.id, requestId));

      return NextResponse.json({
        success: true,
        message: 'Request rejected successfully'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating message request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update message request' },
      { status: 500 }
    );
  }
}