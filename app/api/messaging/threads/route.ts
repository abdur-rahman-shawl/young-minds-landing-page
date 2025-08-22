import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  messageThreads,
  messagingPermissions,
  users,
  messages
} from '@/lib/db/schema';
import { eq, and, or, desc, ne, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const permissions = await db
      .select()
      .from(messagingPermissions)
      .where(
        and(
          eq(messagingPermissions.userId, userId),
          eq(messagingPermissions.status, 'active'),
          eq(messagingPermissions.blockedByUser, false),
          eq(messagingPermissions.blockedByAllowedUser, false)
        )
      );

    const allowedUserIds = permissions.map(p => p.allowedUserId);

    if (allowedUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    let threadsQuery = db
      .select({
        thread: messageThreads,
        otherUser: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image
        },
        unreadCount: sql<number>`
          CASE 
            WHEN ${messageThreads.participant1Id} = ${userId} 
            THEN ${messageThreads.participant1UnreadCount}
            ELSE ${messageThreads.participant2UnreadCount}
          END
        `,
        isArchived: sql<boolean>`
          CASE 
            WHEN ${messageThreads.participant1Id} = ${userId} 
            THEN ${messageThreads.participant1Archived}
            ELSE ${messageThreads.participant2Archived}
          END
        `,
        isMuted: sql<boolean>`
          CASE 
            WHEN ${messageThreads.participant1Id} = ${userId} 
            THEN ${messageThreads.participant1Muted}
            ELSE ${messageThreads.participant2Muted}
          END
        `
      })
      .from(messageThreads)
      .leftJoin(
        users,
        or(
          and(
            eq(messageThreads.participant1Id, userId),
            eq(messageThreads.participant2Id, users.id)
          ),
          and(
            eq(messageThreads.participant2Id, userId),
            eq(messageThreads.participant1Id, users.id)
          )
        )
      )
      .where(
        and(
          or(
            eq(messageThreads.participant1Id, userId),
            eq(messageThreads.participant2Id, userId)
          ),
          eq(messageThreads.status, 'active'),
          or(
            and(
              eq(messageThreads.participant1Id, userId),
              eq(messageThreads.participant1Deleted, false),
              includeArchived ? sql`true` : eq(messageThreads.participant1Archived, false)
            ),
            and(
              eq(messageThreads.participant2Id, userId),
              eq(messageThreads.participant2Deleted, false),
              includeArchived ? sql`true` : eq(messageThreads.participant2Archived, false)
            )
          )
        )
      )
      .orderBy(desc(messageThreads.lastMessageAt));

    const threads = await threadsQuery;

    const threadsWithPermissions = threads.filter(thread => 
      allowedUserIds.includes(thread.otherUser?.id || '')
    );

    return NextResponse.json({
      success: true,
      data: threadsWithPermissions
    });
  } catch (error) {
    console.error('Error fetching message threads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message threads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, recipientId } = body;

    if (!userId || !recipientId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Recipient ID are required' },
        { status: 400 }
      );
    }

    const hasPermission = await db
      .select()
      .from(messagingPermissions)
      .where(
        and(
          eq(messagingPermissions.userId, userId),
          eq(messagingPermissions.allowedUserId, recipientId),
          eq(messagingPermissions.status, 'active'),
          eq(messagingPermissions.blockedByUser, false),
          eq(messagingPermissions.blockedByAllowedUser, false)
        )
      )
      .limit(1);

    if (hasPermission.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to message this user' },
        { status: 403 }
      );
    }

    const existingThread = await db
      .select()
      .from(messageThreads)
      .where(
        or(
          and(
            eq(messageThreads.participant1Id, userId),
            eq(messageThreads.participant2Id, recipientId)
          ),
          and(
            eq(messageThreads.participant1Id, recipientId),
            eq(messageThreads.participant2Id, userId)
          )
        )
      )
      .limit(1);

    if (existingThread.length > 0) {
      const thread = existingThread[0];
      
      if (thread.participant1Id === userId && thread.participant1Deleted) {
        await db
          .update(messageThreads)
          .set({
            participant1Deleted: false,
            participant1DeletedAt: null,
            participant1Archived: false,
            participant1ArchivedAt: null,
            updatedAt: new Date()
          })
          .where(eq(messageThreads.id, thread.id));
      } else if (thread.participant2Id === userId && thread.participant2Deleted) {
        await db
          .update(messageThreads)
          .set({
            participant2Deleted: false,
            participant2DeletedAt: null,
            participant2Archived: false,
            participant2ArchivedAt: null,
            updatedAt: new Date()
          })
          .where(eq(messageThreads.id, thread.id));
      }

      return NextResponse.json({
        success: true,
        data: thread,
        message: 'Thread already exists'
      });
    }

    const [participant1Id, participant2Id] = [userId, recipientId].sort();

    const [newThread] = await db
      .insert(messageThreads)
      .values({
        participant1Id,
        participant2Id,
        status: 'active'
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newThread,
      message: 'Thread created successfully'
    });
  } catch (error) {
    console.error('Error creating message thread:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create message thread' },
      { status: 500 }
    );
  }
}