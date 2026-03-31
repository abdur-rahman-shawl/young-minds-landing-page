import { NextRequest, NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';

import { requireAdmin } from '@/lib/api/guards';
import { db } from '@/lib/db';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import {
  messages,
  messageThreads,
  messagingPermissions,
  notifications,
} from '@/lib/db/schema';
import { buildMessagingThreadUrl } from '@/lib/messaging/urls';
import { z } from 'zod';

const createAdminThreadSchema = z.object({
  recipientId: z.string().trim().min(1, 'Recipient is required'),
  content: z.string().trim().min(1, 'Message is required').max(5000),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('error' in guard) {
    return guard.error;
  }

  try {
    const body = await request.json();
    const validatedData = createAdminThreadSchema.parse(body);
    const adminId = guard.user.id;

    if (validatedData.recipientId === adminId) {
      return NextResponse.json(
        { success: false, error: 'You cannot message yourself' },
        { status: 400 }
      );
    }

    const recipient = await getUserWithRoles(validatedData.recipientId);

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const recipientRoles = new Set(recipient.roles.map((role) => role.name));
    if (!recipientRoles.has('mentor') && !recipientRoles.has('mentee')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admins can only initiate conversations with mentors or mentees',
        },
        { status: 400 }
      );
    }

    const adminDisplayName =
      guard.user.name?.trim() ||
      guard.session.user.name?.trim() ||
      'Admin';

    const result = await db.transaction(async (tx) => {
      const existingPermissions = await tx
        .select()
        .from(messagingPermissions)
        .where(
          or(
            and(
              eq(messagingPermissions.userId, adminId),
              eq(messagingPermissions.allowedUserId, recipient.id)
            ),
            and(
              eq(messagingPermissions.userId, recipient.id),
              eq(messagingPermissions.allowedUserId, adminId)
            )
          )
        );

      const adminToRecipientPermission = existingPermissions.find(
        (permission) =>
          permission.userId === adminId &&
          permission.allowedUserId === recipient.id
      );
      const recipientToAdminPermission = existingPermissions.find(
        (permission) =>
          permission.userId === recipient.id &&
          permission.allowedUserId === adminId
      );

      if (adminToRecipientPermission) {
        await tx
          .update(messagingPermissions)
          .set({
            status: 'active',
            grantedViaRequestId: null,
            blockedByUser: false,
            blockedByAllowedUser: false,
            blockedAt: null,
            blockReason: null,
            updatedAt: new Date(),
          })
          .where(eq(messagingPermissions.id, adminToRecipientPermission.id));
      } else {
        await tx.insert(messagingPermissions).values({
          userId: adminId,
          allowedUserId: recipient.id,
          status: 'active',
          grantedViaRequestId: null,
        });
      }

      if (recipientToAdminPermission) {
        await tx
          .update(messagingPermissions)
          .set({
            status: 'active',
            grantedViaRequestId: null,
            blockedByUser: false,
            blockedByAllowedUser: false,
            blockedAt: null,
            blockReason: null,
            updatedAt: new Date(),
          })
          .where(eq(messagingPermissions.id, recipientToAdminPermission.id));
      } else {
        await tx.insert(messagingPermissions).values({
          userId: recipient.id,
          allowedUserId: adminId,
          status: 'active',
          grantedViaRequestId: null,
        });
      }

      const [existingThread] = await tx
        .select()
        .from(messageThreads)
        .where(
          or(
            and(
              eq(messageThreads.participant1Id, adminId),
              eq(messageThreads.participant2Id, recipient.id)
            ),
            and(
              eq(messageThreads.participant1Id, recipient.id),
              eq(messageThreads.participant2Id, adminId)
            )
          )
        )
        .limit(1);

      let thread = existingThread;

      if (!thread) {
        const [participant1Id, participant2Id] = [adminId, recipient.id].sort();
        [thread] = await tx
          .insert(messageThreads)
          .values({
            participant1Id,
            participant2Id,
            status: 'active',
          })
          .returning();
      }

      const [newMessage] = await tx
        .insert(messages)
        .values({
          threadId: thread.id,
          senderId: adminId,
          receiverId: recipient.id,
          content: validatedData.content,
          messageType: 'text',
          status: 'sent',
          isDelivered: true,
          deliveredAt: new Date(),
        })
        .returning();

      const recipientIsParticipant1 = thread.participant1Id === recipient.id;

      await tx
        .update(messageThreads)
        .set({
          status: 'active',
          lastMessageId: newMessage.id,
          lastMessageAt: newMessage.createdAt,
          lastMessagePreview: newMessage.content.substring(0, 100),
          participant1UnreadCount: recipientIsParticipant1
            ? (thread.participant1UnreadCount ?? 0) + 1
            : (thread.participant1UnreadCount ?? 0),
          participant2UnreadCount: recipientIsParticipant1
            ? (thread.participant2UnreadCount ?? 0)
            : (thread.participant2UnreadCount ?? 0) + 1,
          participant1Archived: false,
          participant2Archived: false,
          participant1ArchivedAt: null,
          participant2ArchivedAt: null,
          participant1Deleted: false,
          participant2Deleted: false,
          participant1DeletedAt: null,
          participant2DeletedAt: null,
          totalMessages: (thread.totalMessages ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(messageThreads.id, thread.id));

      await tx
        .update(messagingPermissions)
        .set({
          messagesExchanged:
            (adminToRecipientPermission?.messagesExchanged ?? 0) + 1,
          lastMessageAt: newMessage.createdAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(messagingPermissions.userId, adminId),
            eq(messagingPermissions.allowedUserId, recipient.id)
          )
        );

      await tx
        .update(messagingPermissions)
        .set({
          lastMessageAt: newMessage.createdAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(messagingPermissions.userId, recipient.id),
            eq(messagingPermissions.allowedUserId, adminId)
          )
        );

      await tx.insert(notifications).values({
        userId: recipient.id,
        type: 'MESSAGE_RECEIVED',
        title: `New message from ${adminDisplayName}`,
        message: `${adminDisplayName} sent you a message`,
        relatedId: thread.id,
        relatedType: 'thread',
        actionUrl: buildMessagingThreadUrl(thread.id),
        actionText: 'Open Conversation',
      });

      return {
        threadId: thread.id,
        messageId: newMessage.id,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Conversation started successfully',
    });
  } catch (error) {
    console.error('Error creating admin conversation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to start conversation' },
      { status: 500 }
    );
  }
}
