import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';

async function requireSession(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await requireSession(request);
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('conversationWith');

    if (conversationWith) {
      // Get messages between two specific users
      const conversation = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          createdAt: messages.createdAt,
          isRead: messages.isRead,
          // Sender info
          senderName: users.name,
          senderImage: users.image,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(
          or(
            and(eq(messages.senderId, currentUserId), eq(messages.receiverId, conversationWith)),
            and(eq(messages.senderId, conversationWith), eq(messages.receiverId, currentUserId))
          )
        )
        .orderBy(messages.createdAt);

      return NextResponse.json({
        success: true,
        data: conversation
      });
    } else {
      // Get all conversations for the user (latest message from each conversation)
      const userMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          createdAt: messages.createdAt,
          isRead: messages.isRead,
          // Other party info
          otherPartyId: users.id,
          otherPartyName: users.name,
          otherPartyImage: users.image,
        })
        .from(messages)
        .leftJoin(users, 
          or(
            and(eq(messages.senderId, users.id), eq(messages.receiverId, currentUserId)),
            and(eq(messages.receiverId, users.id), eq(messages.senderId, currentUserId))
          )
        )
        .where(
          or(
            eq(messages.senderId, currentUserId),
            eq(messages.receiverId, currentUserId)
          )
        )
        .orderBy(desc(messages.createdAt));

      return NextResponse.json({
        success: true,
        data: userMessages
      });
    }

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await requireSession(request);
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { receiverId, content, action, messageIds } = body;

    if (action === 'send') {
      if (!receiverId || !content) {
        return NextResponse.json(
          { success: false, error: 'Receiver ID and content are required' },
          { status: 400 }
        );
      }

      if (receiverId === currentUserId) {
        return NextResponse.json(
          { success: false, error: 'Cannot send messages to yourself' },
          { status: 400 }
        );
      }

      // Create new message - remove ID since it auto-generates, use correct field names
      const [newMessage] = await db
        .insert(messages)
        .values({
          senderId: currentUserId,
          receiverId,
          content: content.trim(),
          isRead: false,
          // createdAt will auto-populate
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newMessage,
        message: 'Message sent successfully'
      });
    }

    if (action === 'markAsRead') {
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Message IDs array is required' },
          { status: 400 }
        );
      }

      // Mark messages as read
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.receiverId, currentUserId),
            inArray(messages.id, messageIds)
          )
        );

      return NextResponse.json({
        success: true,
        message: 'Messages marked as read'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error managing messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage messages' },
      { status: 500 }
    );
  }
}
