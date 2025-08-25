import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  messageReactions,
  messages,
  messageThreads,
  messagingPermissions,
  users
} from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const reactionSchema = z.object({
  userId: z.string().min(1),
  emoji: z.string().emoji().min(1).max(4),
});

const reactionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 reactions per minute
});

async function checkUserPermission(messageId: string, userId: string) {
  // Get the message and its thread
  const [message] = await db
    .select({
      threadId: messages.threadId,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) {
    throw new Error('Message not found');
  }

  // Check if user is part of the conversation
  if (message.senderId !== userId && message.receiverId !== userId) {
    throw new Error('You do not have permission to react to this message');
  }

  // If message is in a thread, verify thread access
  if (message.threadId) {
    const [thread] = await db
      .select()
      .from(messageThreads)
      .where(
        and(
          eq(messageThreads.id, message.threadId),
          or(
            eq(messageThreads.participant1Id, userId),
            eq(messageThreads.participant2Id, userId)
          )
        )
      )
      .limit(1);

    if (!thread) {
      throw new Error('You do not have access to this thread');
    }
  }

  // Check if users have messaging permission
  const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
  const [permission] = await db
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

  if (!permission) {
    throw new Error('You do not have permission to interact with this user');
  }

  return true;
}

export async function GET(
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

    // Get all reactions for the message with user details
    const reactions = await db
      .select({
        reaction: messageReactions,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(messageReactions)
      .leftJoin(users, eq(messageReactions.userId, users.id))
      .where(eq(messageReactions.messageId, messageId));

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, { reaction, user }) => {
      const emoji = reaction.emoji;
      if (!acc[emoji]) {
        acc[emoji] = {
          emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }
      acc[emoji].count++;
      acc[emoji].users.push(user);
      if (user?.id === userId) {
        acc[emoji].hasReacted = true;
      }
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: Object.values(groupedReactions),
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting
    reactionRateLimit.check(request);

    const messageId = params.id;
    const body = await request.json();
    
    const validatedData = reactionSchema.parse(body);
    const { userId, emoji } = validatedData;

    // Check permissions
    await checkUserPermission(messageId, userId);

    // Check if reaction already exists
    const [existingReaction] = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      )
      .limit(1);

    if (existingReaction) {
      // Remove the reaction (toggle off)
      await db
        .delete(messageReactions)
        .where(eq(messageReactions.id, existingReaction.id));

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Reaction removed',
      });
    } else {
      // Add the reaction
      const [newReaction] = await db
        .insert(messageReactions)
        .values({
          messageId,
          userId,
          emoji,
        })
        .returning();

      // Get user details for the response
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return NextResponse.json({
        success: true,
        action: 'added',
        data: {
          reaction: newReaction,
          user,
        },
        message: 'Reaction added',
      });
    }
  } catch (error) {
    console.error('Error managing reaction:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      
      if (error.message === 'RateLimitError') {
        return NextResponse.json(
          { success: false, error: 'Too many reactions. Please slow down.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to manage reaction' },
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
    const emoji = searchParams.get('emoji');

    if (!userId || !emoji) {
      return NextResponse.json(
        { success: false, error: 'User ID and emoji are required' },
        { status: 400 }
      );
    }

    // Check permissions
    await checkUserPermission(messageId, userId);

    // Delete the reaction
    await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}