import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  messages,
  messageThreads,
  messagingPermissions,
  messageQuotas,
  notifications,
  users
} from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const sendMessageSchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1).max(5000),
  replyToId: z.string().uuid().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
  attachmentSize: z.string().optional(),
  attachmentName: z.string().optional()
});

const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100
});

async function checkAndUpdateMessageQuota(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));

  let [quota] = await db
    .select()
    .from(messageQuotas)
    .where(eq(messageQuotas.userId, userId))
    .limit(1);

  if (!quota) {
    [quota] = await db
      .insert(messageQuotas)
      .values({ userId })
      .returning();
  }

  if (quota.lastResetDaily < startOfDay) {
    await db
      .update(messageQuotas)
      .set({
        messagesSentToday: 0,
        lastResetDaily: startOfDay,
        updatedAt: new Date()
      })
      .where(eq(messageQuotas.userId, userId));
    
    quota.messagesSentToday = 0;
  }

  if (quota.messagesSentToday >= quota.dailyMessageLimit) {
    throw new Error('Daily message limit exceeded');
  }

  await db
    .update(messageQuotas)
    .set({
      messagesSentToday: quota.messagesSentToday + 1,
      updatedAt: new Date()
    })
    .where(eq(messageQuotas.userId, userId));

  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    messageRateLimit.check(request);

    const threadId = params.id;
    const body = await request.json();
    
    const validatedData = sendMessageSchema.parse(body);
    const { userId, content, ...messageData } = validatedData;

    await checkAndUpdateMessageQuota(userId);

    const [thread] = await db
      .select()
      .from(messageThreads)
      .where(
        and(
          eq(messageThreads.id, threadId),
          or(
            eq(messageThreads.participant1Id, userId),
            eq(messageThreads.participant2Id, userId)
          )
        )
      )
      .limit(1);

    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    const receiverId = thread.participant1Id === userId 
      ? thread.participant2Id 
      : thread.participant1Id;

    const hasPermission = await db
      .select()
      .from(messagingPermissions)
      .where(
        and(
          eq(messagingPermissions.userId, userId),
          eq(messagingPermissions.allowedUserId, receiverId),
          eq(messagingPermissions.status, 'active'),
          eq(messagingPermissions.blockedByUser, false),
          eq(messagingPermissions.blockedByAllowedUser, false)
        )
      )
      .limit(1);

    if (hasPermission.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to send messages to this user' },
        { status: 403 }
      );
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        threadId,
        senderId: userId,
        receiverId,
        content: content.trim(),
        messageType: messageData.attachmentUrl ? 'file' : 'text',
        status: 'sent',
        isDelivered: true,
        deliveredAt: new Date(),
        ...messageData
      })
      .returning();

    const unreadCountField = thread.participant1Id === receiverId
      ? 'participant1UnreadCount'
      : 'participant2UnreadCount';

    await db
      .update(messageThreads)
      .set({
        lastMessageId: newMessage.id,
        lastMessageAt: newMessage.createdAt,
        lastMessagePreview: content.substring(0, 100),
        [unreadCountField]: thread[unreadCountField] + 1,
        totalMessages: thread.totalMessages + 1,
        updatedAt: new Date()
      })
      .where(eq(messageThreads.id, threadId));

    await db
      .update(messagingPermissions)
      .set({
        messagesExchanged: hasPermission[0].messagesExchanged + 1,
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(messagingPermissions.userId, userId),
          eq(messagingPermissions.allowedUserId, receiverId)
        )
      );

    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const isReceiverMuted = thread.participant1Id === receiverId
      ? thread.participant1Muted
      : thread.participant2Muted;

    if (!isReceiverMuted) {
      await db
        .insert(notifications)
        .values({
          userId: receiverId,
          type: 'MESSAGE_RECEIVED',
          title: 'New Message',
          message: `${sender?.name || 'Someone'} sent you a message`,
          relatedId: threadId,
          relatedType: 'thread',
          actionUrl: `/dashboard/messages/${threadId}`,
          actionText: 'View Message'
        });
    }

    const messageWithSender = {
      message: newMessage,
      sender: {
        id: sender?.id,
        name: sender?.name,
        email: sender?.email,
        image: sender?.image
      }
    };

    return NextResponse.json({
      success: true,
      data: messageWithSender,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('limit exceeded')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 429 }
        );
      }
      
      if (error.message === 'RateLimitError') {
        return NextResponse.json(
          { success: false, error: 'Too many messages. Please slow down.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}