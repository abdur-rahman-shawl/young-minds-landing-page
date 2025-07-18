import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const conversationWith = searchParams.get('conversationWith');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

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
            and(eq(messages.senderId, userId), eq(messages.receiverId, conversationWith)),
            and(eq(messages.senderId, conversationWith), eq(messages.receiverId, userId))
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
            and(eq(messages.senderId, users.id), eq(messages.receiverId, userId)),
            and(eq(messages.receiverId, users.id), eq(messages.senderId, userId))
          )
        )
        .where(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
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
    const body = await request.json();
    const { senderId, receiverId, content, action } = body;

    if (action === 'send') {
      if (!senderId || !receiverId || !content) {
        return NextResponse.json(
          { success: false, error: 'Sender ID, Receiver ID, and content are required' },
          { status: 400 }
        );
      }

      // Create new message - remove ID since it auto-generates, use correct field names
      const [newMessage] = await db
        .insert(messages)
        .values({
          senderId,
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
      const { messageIds } = body;

      if (!messageIds || !Array.isArray(messageIds)) {
        return NextResponse.json(
          { success: false, error: 'Message IDs array is required' },
          { status: 400 }
        );
      }

      // Mark messages as read
      await db
        .update(messages)
        .set({ isRead: true })
        .where(eq(messages.receiverId, receiverId));

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