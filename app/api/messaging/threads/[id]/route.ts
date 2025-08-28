import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  messageThreads,
  messagingPermissions,
  messages,
  users
} from '@/lib/db/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

const updateThreadSchema = z.object({
  action: z.enum(['archive', 'unarchive', 'mute', 'unmute', 'delete', 'markAsRead']),
  userId: z.string().min(1),
  muteDuration: z.number().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

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

    const otherUserId = thread.participant1Id === userId 
      ? thread.participant2Id 
      : thread.participant1Id;

    const hasPermission = await db
      .select()
      .from(messagingPermissions)
      .where(
        and(
          eq(messagingPermissions.userId, userId),
          eq(messagingPermissions.allowedUserId, otherUserId),
          eq(messagingPermissions.status, 'active')
        )
      )
      .limit(1);

    if (hasPermission.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this thread' },
        { status: 403 }
      );
    }

    const threadMessages = await db
      .select({
        message: messages,
        sender: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.threadId, threadId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const otherUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image
      })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);

    const unreadMessages = threadMessages.filter(
      m => m.message.receiverId === userId && !m.message.isRead
    );
    
    if (unreadMessages.length > 0) {
      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date(),
          status: 'read',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(messages.threadId, threadId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );

      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (thread.participant1Id === userId) {
        updateData.participant1UnreadCount = 0;
        updateData.participant1LastReadAt = new Date();
      } else {
        updateData.participant2UnreadCount = 0;
        updateData.participant2LastReadAt = new Date();
      }

      await db
        .update(messageThreads)
        .set(updateData)
        .where(eq(messageThreads.id, threadId));
    }

    return NextResponse.json({
      success: true,
      data: {
        thread,
        messages: threadMessages.reverse(),
        otherUser: otherUser[0],
        totalMessages: thread.totalMessages,
        hasMore: offset + limit < thread.totalMessages
      }
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;
    const body = await request.json();
    
    const validatedData = updateThreadSchema.parse(body);
    const { action, userId, muteDuration } = validatedData;

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

    const isParticipant1 = thread.participant1Id === userId;
    const updateData: any = {
      updatedAt: new Date()
    };

    switch (action) {
      case 'archive':
        if (isParticipant1) {
          updateData.participant1Archived = true;
          updateData.participant1ArchivedAt = new Date();
        } else {
          updateData.participant2Archived = true;
          updateData.participant2ArchivedAt = new Date();
        }
        break;

      case 'unarchive':
        if (isParticipant1) {
          updateData.participant1Archived = false;
          updateData.participant1ArchivedAt = null;
        } else {
          updateData.participant2Archived = false;
          updateData.participant2ArchivedAt = null;
        }
        break;

      case 'mute':
        const muteUntil = muteDuration 
          ? new Date(Date.now() + muteDuration * 60 * 60 * 1000)
          : null;
        
        if (isParticipant1) {
          updateData.participant1Muted = true;
          updateData.participant1MutedUntil = muteUntil;
        } else {
          updateData.participant2Muted = true;
          updateData.participant2MutedUntil = muteUntil;
        }
        break;

      case 'unmute':
        if (isParticipant1) {
          updateData.participant1Muted = false;
          updateData.participant1MutedUntil = null;
        } else {
          updateData.participant2Muted = false;
          updateData.participant2MutedUntil = null;
        }
        break;

      case 'delete':
        if (isParticipant1) {
          updateData.participant1Deleted = true;
          updateData.participant1DeletedAt = new Date();
        } else {
          updateData.participant2Deleted = true;
          updateData.participant2DeletedAt = new Date();
        }
        break;

      case 'markAsRead':
        if (isParticipant1) {
          updateData.participant1UnreadCount = 0;
          updateData.participant1LastReadAt = new Date();
        } else {
          updateData.participant2UnreadCount = 0;
          updateData.participant2LastReadAt = new Date();
        }

        await db
          .update(messages)
          .set({
            isRead: true,
            readAt: new Date(),
            status: 'read',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(messages.threadId, threadId),
              eq(messages.receiverId, userId),
              eq(messages.isRead, false)
            )
          );
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    await db
      .update(messageThreads)
      .set(updateData)
      .where(eq(messageThreads.id, threadId));

    return NextResponse.json({
      success: true,
      message: `Thread ${action}d successfully`
    });
  } catch (error) {
    console.error('Error updating thread:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update thread' },
      { status: 500 }
    );
  }
}