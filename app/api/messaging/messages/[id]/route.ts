import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, messageThreads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const editMessageSchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

const MAX_EDIT_COUNT = 5;
const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id;
    const body = await request.json();
    
    const validatedData = editMessageSchema.parse(body);
    const { userId, content } = validatedData;

    // Fetch the message
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Security checks
    if (message.senderId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    if (message.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit deleted messages' },
        { status: 400 }
      );
    }

    // Check if message type allows editing
    if (message.messageType !== 'text') {
      return NextResponse.json(
        { success: false, error: 'Only text messages can be edited' },
        { status: 400 }
      );
    }

    // Check time limit
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > EDIT_TIME_LIMIT_MS) {
      return NextResponse.json(
        { success: false, error: 'Messages can only be edited within 15 minutes' },
        { status: 400 }
      );
    }

    // Check edit count
    let editHistory = [];
    if (message.metadata) {
      try {
        const metadata = JSON.parse(message.metadata);
        editHistory = metadata.editHistory || [];
        
        if (editHistory.length >= MAX_EDIT_COUNT) {
          return NextResponse.json(
            { success: false, error: `Maximum ${MAX_EDIT_COUNT} edits allowed per message` },
            { status: 400 }
          );
        }
      } catch (e) {
        // Invalid metadata, create new
      }
    }

    // Store edit history
    editHistory.push({
      content: message.content,
      editedAt: message.editedAt || message.createdAt,
      editNumber: editHistory.length + 1,
    });

    const newMetadata = JSON.stringify({
      editHistory,
      lastEditedBy: userId,
      totalEdits: editHistory.length,
    });

    // Update the message
    const [updatedMessage] = await db
      .update(messages)
      .set({
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
        metadata: newMetadata,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    // Update thread's last message preview if this was the last message
    if (message.threadId) {
      const [thread] = await db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, message.threadId))
        .limit(1);

      if (thread && thread.lastMessageId === messageId) {
        await db
          .update(messageThreads)
          .set({
            lastMessagePreview: content.substring(0, 100),
            updatedAt: new Date(),
          })
          .where(eq(messageThreads.id, message.threadId));
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedMessage,
      message: 'Message edited successfully',
    });
  } catch (error) {
    console.error('Error editing message:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch the message
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Only sender can delete their own messages
    if (message.senderId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Soft delete the message
    const [deletedMessage] = await db
      .update(messages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Message deleted]',
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    return NextResponse.json({
      success: true,
      data: deletedMessage,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}