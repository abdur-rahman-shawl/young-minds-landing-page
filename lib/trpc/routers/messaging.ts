import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { resolveMessagingPolicy } from '@/lib/messaging/policy';
import {
  buildMessagingRequestsUrl,
  buildMessagingThreadUrl,
} from '@/lib/messaging/urls';
import { rateLimit } from '@/lib/rate-limit';
import {
  consumeFeature,
  enforceFeature,
  isSubscriptionPolicyError,
} from '@/lib/subscriptions/policy-runtime';
import {
  messageReactions,
  messageRequests,
  messageThreads,
  messages,
  messagingPermissions,
  notifications,
  roles,
  userRoles,
  users,
} from '@/lib/db/schema';
import type { TRPCContext } from '../context';
import { createTRPCRouter, protectedProcedure } from '../init';

type AuthenticatedContext = TRPCContext & {
  session: NonNullable<TRPCContext['session']>;
  userId: string;
};

class MessagingRouterError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'MessagingRouterError';
  }
}

function mapStatusToTRPCCode(
  status: number
): TRPCError['code'] {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function throwAsTRPCError(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof MessagingRouterError) {
    throw new TRPCError({
      code: mapStatusToTRPCCode(error.status),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof z.ZodError) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.errors[0]?.message ?? 'Invalid input',
      cause: error,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    cause: error instanceof Error ? error : undefined,
  });
}

function assertOrThrow(
  condition: unknown,
  status: number,
  message: string,
  data?: unknown
): asserts condition {
  if (!condition) {
    throw new MessagingRouterError(status, message, data);
  }
}

function toSubscriptionError(error: unknown): never {
  if (isSubscriptionPolicyError(error)) {
    const message =
      typeof error.payload?.error === 'string'
        ? error.payload.error
        : 'Subscription policy prevented this action';

    throw new MessagingRouterError(error.status, message, error.payload);
  }

  throw error;
}

const listThreadsInputSchema = z
  .object({
    includeArchived: z.boolean().default(false),
  })
  .default({ includeArchived: false });

const getThreadInputSchema = z.object({
  threadId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const createRequestSchema = z.object({
  recipientId: z.string().min(1),
  initialMessage: z.string().min(10).max(500),
  requestReason: z.string().optional(),
  requestType: z.enum(['mentor_to_mentee', 'mentee_to_mentor']),
});

const listRequestsInputSchema = z
  .object({
    type: z.enum(['all', 'sent', 'received']).default('received'),
    status: z
      .enum(['all', 'pending', 'accepted', 'rejected', 'expired', 'cancelled'])
      .default('pending'),
  })
  .default({ type: 'received', status: 'pending' });

const handleRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['accept', 'reject', 'cancel']),
  responseMessage: z.string().optional(),
});

const updateThreadSchema = z.object({
  threadId: z.string().uuid(),
  action: z.enum(['archive', 'unarchive', 'mute', 'unmute', 'delete', 'markAsRead']),
  muteDuration: z.number().int().positive().optional(),
});

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  replyToId: z.string().uuid().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
  attachmentSize: z.string().optional(),
  attachmentName: z.string().optional(),
});

const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const deleteMessageSchema = z.object({
  messageId: z.string().uuid(),
});

const listReactionsSchema = z.object({
  messageId: z.string().uuid(),
});

const toggleReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().emoji().min(1).max(4),
});

const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

const reactionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

const MAX_EDIT_COUNT = 5;
const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000;
const recipientUser = alias(users, 'recipientUser');

async function listThreads(
  ctx: AuthenticatedContext,
  input: z.infer<typeof listThreadsInputSchema>
) {
  const { userId } = ctx;

  const permissions = await ctx.db
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

  const allowedUserIds = permissions.map((permission) => permission.allowedUserId);

  if (allowedUserIds.length === 0) {
    return [];
  }

  const threads = await ctx.db
    .select({
      thread: messageThreads,
      otherUser: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
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
      `,
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
            input.includeArchived ? sql`true` : eq(messageThreads.participant1Archived, false)
          ),
          and(
            eq(messageThreads.participant2Id, userId),
            eq(messageThreads.participant2Deleted, false),
            input.includeArchived ? sql`true` : eq(messageThreads.participant2Archived, false)
          )
        )
      )
    )
    .orderBy(desc(messageThreads.lastMessageAt));

  const permittedThreads = threads.filter((thread) =>
    allowedUserIds.includes(thread.otherUser?.id ?? '')
  );

  const otherUserIds = permittedThreads
    .map((thread) => thread.otherUser?.id)
    .filter((id): id is string => Boolean(id));

  const adminUserIds =
    otherUserIds.length > 0
      ? await ctx.db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(
            and(
              inArray(userRoles.userId, otherUserIds),
              eq(roles.name, 'admin')
            )
          )
      : [];

  const adminUserIdSet = new Set(adminUserIds.map((row) => row.userId));

  return permittedThreads.map((thread) => ({
    ...thread,
    otherUser: thread.otherUser
      ? {
          ...thread.otherUser,
          isAdmin: adminUserIdSet.has(thread.otherUser.id),
        }
      : null,
  }));
}

async function getThread(
  ctx: AuthenticatedContext,
  input: z.infer<typeof getThreadInputSchema>
) {
  const { userId } = ctx;

  const [thread] = await ctx.db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.id, input.threadId),
        or(
          eq(messageThreads.participant1Id, userId),
          eq(messageThreads.participant2Id, userId)
        )
      )
    )
    .limit(1);

  assertOrThrow(thread, 404, 'Thread not found');

  const otherUserId =
    thread.participant1Id === userId ? thread.participant2Id : thread.participant1Id;

  const [permission] = await ctx.db
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

  assertOrThrow(permission, 403, 'You do not have permission to view this thread');

  const threadMessages = await ctx.db
    .select({
      message: messages,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.threadId, input.threadId), eq(messages.isDeleted, false)))
    .orderBy(desc(messages.createdAt))
    .limit(input.limit)
    .offset(input.offset);

  const [otherUser] = await ctx.db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, otherUserId))
    .limit(1);

  const [otherUserAdminRole] = await ctx.db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, otherUserId), eq(roles.name, 'admin')))
    .limit(1);

  const messageIds = threadMessages.map((entry) => entry.message.id);
  const reactionsMap: Record<
    string,
    Array<{
      emoji: string;
      count: number;
      users: Array<{
        id: string;
        name: string;
        email: string;
        image: string | null;
      }>;
      hasReacted: boolean;
    }>
  > = {};

  if (messageIds.length > 0) {
    const allReactions = await ctx.db
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
      .where(inArray(messageReactions.messageId, messageIds));

    for (const { reaction, user } of allReactions) {
      const messageId = reaction.messageId;
      if (!reactionsMap[messageId]) {
        reactionsMap[messageId] = [];
      }

      let emojiGroup = reactionsMap[messageId].find(
        (group) => group.emoji === reaction.emoji
      );

      if (!emojiGroup) {
        emojiGroup = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
        reactionsMap[messageId].push(emojiGroup);
      }

      emojiGroup.count += 1;

      if (user) {
        emojiGroup.users.push(user);
        if (user.id === userId) {
          emojiGroup.hasReacted = true;
        }
      }
    }
  }

  const messagesWithReactions = threadMessages.map((entry) => ({
    ...entry,
    reactions: reactionsMap[entry.message.id] ?? [],
  }));

  const unreadMessages = threadMessages.filter(
    (entry) => entry.message.receiverId === userId && !entry.message.isRead
  );

  if (unreadMessages.length > 0) {
    await ctx.db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
        status: 'read',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.threadId, input.threadId),
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );

    const updateData =
      thread.participant1Id === userId
        ? {
            participant1UnreadCount: 0,
            participant1LastReadAt: new Date(),
            updatedAt: new Date(),
          }
        : {
            participant2UnreadCount: 0,
            participant2LastReadAt: new Date(),
            updatedAt: new Date(),
          };

    await ctx.db
      .update(messageThreads)
      .set(updateData)
      .where(eq(messageThreads.id, input.threadId));
  }

  return {
    thread,
    messages: messagesWithReactions.reverse(),
    otherUser: otherUser
      ? {
          ...otherUser,
          isAdmin: Boolean(otherUserAdminRole),
        }
      : null,
    totalMessages: thread.totalMessages,
    hasMore: input.offset + input.limit < thread.totalMessages,
  };
}

async function updateThread(
  ctx: AuthenticatedContext,
  input: z.infer<typeof updateThreadSchema>
) {
  const { userId } = ctx;

  const [thread] = await ctx.db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.id, input.threadId),
        or(
          eq(messageThreads.participant1Id, userId),
          eq(messageThreads.participant2Id, userId)
        )
      )
    )
    .limit(1);

  assertOrThrow(thread, 404, 'Thread not found');

  const isParticipant1 = thread.participant1Id === userId;
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  switch (input.action) {
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
      if (isParticipant1) {
        updateData.participant1Muted = true;
        updateData.participant1MutedUntil = input.muteDuration
          ? new Date(Date.now() + input.muteDuration * 60 * 60 * 1000)
          : null;
      } else {
        updateData.participant2Muted = true;
        updateData.participant2MutedUntil = input.muteDuration
          ? new Date(Date.now() + input.muteDuration * 60 * 60 * 1000)
          : null;
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

      await ctx.db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date(),
          status: 'read',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(messages.threadId, input.threadId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );
      break;
  }

  await ctx.db
    .update(messageThreads)
    .set(updateData)
    .where(eq(messageThreads.id, input.threadId));

  return {
    action: input.action,
  };
}

async function sendMessage(
  ctx: AuthenticatedContext,
  input: z.infer<typeof sendMessageSchema>
) {
  messageRateLimit.check(ctx.req);

  const { userId } = ctx;
  const { threadId, content, ...messageData } = input;

  const [thread] = await ctx.db
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

  assertOrThrow(thread, 404, 'Thread not found');

  const receiverId =
    thread.participant1Id === userId ? thread.participant2Id : thread.participant1Id;

  const [permission] = await ctx.db
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

  assertOrThrow(
    permission,
    403,
    'You do not have permission to send messages to this user'
  );

  let directMessageAction:
    | 'messaging.direct_message.mentor'
    | 'messaging.direct_message.mentee'
    | null = null;

  if (permission.grantedViaRequestId) {
    const [permissionRequest] = await ctx.db
      .select()
      .from(messageRequests)
      .where(eq(messageRequests.id, permission.grantedViaRequestId))
      .limit(1);

    assertOrThrow(
      permissionRequest,
      500,
      'Unable to resolve messaging audience for this thread'
    );

    const policy = resolveMessagingPolicy({
      kind: 'request',
      requestType: permissionRequest.requestType,
      requesterId: permissionRequest.requesterId,
      senderId: userId,
    });

    assertOrThrow(
      policy.enforcement === 'subscription',
      500,
      'Unexpected direct-messaging policy for request-backed thread'
    );

    directMessageAction = policy.action;

    try {
      await enforceFeature({
        action: directMessageAction,
        userId,
      });
    } catch (error) {
      toSubscriptionError(error);
    }
    } else {
      const [sender, receiver] = await Promise.all([
        getUserWithRoles(userId),
        getUserWithRoles(receiverId),
      ]);

      assertOrThrow(sender, 404, 'Unable to resolve conversation participants');
      assertOrThrow(receiver, 404, 'Unable to resolve conversation participants');

      resolveMessagingPolicy({
        kind: 'direct',
      senderRoles: sender.roles.map((role) => role.name),
      receiverRoles: receiver.roles.map((role) => role.name),
    });
  }

  const [newMessage] = await ctx.db
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
      ...messageData,
    })
    .returning();

  if (directMessageAction) {
    try {
      await consumeFeature({
        action: directMessageAction,
        userId,
        resourceType: 'message',
        resourceId: newMessage.id,
      });
    } catch (error) {
      toSubscriptionError(error);
    }
  }

  const unreadCountField =
    thread.participant1Id === receiverId
      ? 'participant1UnreadCount'
      : 'participant2UnreadCount';
  const receiverArchivedField =
    thread.participant1Id === receiverId ? 'participant1Archived' : 'participant2Archived';
  const receiverArchivedAtField =
    thread.participant1Id === receiverId
      ? 'participant1ArchivedAt'
      : 'participant2ArchivedAt';
  const receiverDeletedField =
    thread.participant1Id === receiverId ? 'participant1Deleted' : 'participant2Deleted';
  const receiverDeletedAtField =
    thread.participant1Id === receiverId
      ? 'participant1DeletedAt'
      : 'participant2DeletedAt';
  const nextUnreadCount = ((thread[unreadCountField] as number | null) ?? 0) + 1;

  await ctx.db
    .update(messageThreads)
    .set({
      status: 'active',
      lastMessageId: newMessage.id,
      lastMessageAt: newMessage.createdAt,
      lastMessagePreview: content.substring(0, 100),
      [unreadCountField]: nextUnreadCount,
      [receiverArchivedField]: false,
      [receiverArchivedAtField]: null,
      [receiverDeletedField]: false,
      [receiverDeletedAtField]: null,
      totalMessages: (thread.totalMessages ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(messageThreads.id, threadId));

  await ctx.db
    .update(messagingPermissions)
    .set({
      messagesExchanged: (permission.messagesExchanged ?? 0) + 1,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messagingPermissions.userId, userId),
        eq(messagingPermissions.allowedUserId, receiverId)
      )
    );

  const [sender] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const isReceiverMuted =
    thread.participant1Id === receiverId ? thread.participant1Muted : thread.participant2Muted;

  if (!isReceiverMuted) {
    await ctx.db.insert(notifications).values({
      userId: receiverId,
      type: 'MESSAGE_RECEIVED',
      title: 'New Message',
      message: `${sender?.name || 'Someone'} sent you a message`,
      relatedId: threadId,
      relatedType: 'thread',
      actionUrl: buildMessagingThreadUrl(threadId),
      actionText: 'View Message',
    });
  }

  return {
    message: newMessage,
    sender: sender
      ? {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          image: sender.image,
        }
      : null,
  };
}

async function listRequests(
  ctx: AuthenticatedContext,
  input: z.infer<typeof listRequestsInputSchema>
) {
  const filters = [];

  if (input.type === 'sent') {
    filters.push(eq(messageRequests.requesterId, ctx.userId));
  } else if (input.type === 'received') {
    filters.push(eq(messageRequests.recipientId, ctx.userId));
  } else {
    filters.push(
      or(
        eq(messageRequests.requesterId, ctx.userId),
        eq(messageRequests.recipientId, ctx.userId)
      )
    );
  }

  if (input.status !== 'all') {
    filters.push(eq(messageRequests.status, input.status));
  }

  return ctx.db
    .select({
      request: messageRequests,
      requester: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
      recipient: {
        id: recipientUser.id,
        name: recipientUser.name,
        email: recipientUser.email,
        image: recipientUser.image,
      },
    })
    .from(messageRequests)
    .leftJoin(users, eq(messageRequests.requesterId, users.id))
    .leftJoin(recipientUser, eq(messageRequests.recipientId, recipientUser.id))
    .where(and(...filters))
    .orderBy(desc(messageRequests.createdAt));
}

async function hasPendingRequest(
  ctx: AuthenticatedContext,
  requesterId: string,
  recipientId: string
) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const existing = await ctx.db
    .select()
    .from(messageRequests)
    .where(
      and(
        eq(messageRequests.requesterId, requesterId),
        eq(messageRequests.recipientId, recipientId),
        eq(messageRequests.status, 'pending'),
        gte(messageRequests.createdAt, oneWeekAgo)
      )
    )
    .limit(1);

  return existing.length > 0;
}

async function sendRequest(
  ctx: AuthenticatedContext,
  input: z.infer<typeof createRequestSchema>
) {
  const { userId } = ctx;

  assertOrThrow(
    input.recipientId !== userId,
    400,
    'Cannot send a message request to yourself'
  );

  const requestAction =
    input.requestType === 'mentor_to_mentee'
      ? 'messaging.request.mentor'
      : 'messaging.request.mentee';

  try {
    await enforceFeature({
      action: requestAction,
      userId,
    });
  } catch (error) {
    toSubscriptionError(error);
  }

  const existingPermission = await ctx.db
    .select()
    .from(messagingPermissions)
    .where(
      and(
        or(
          and(
            eq(messagingPermissions.userId, userId),
            eq(messagingPermissions.allowedUserId, input.recipientId)
          ),
          and(
            eq(messagingPermissions.userId, input.recipientId),
            eq(messagingPermissions.allowedUserId, userId)
          )
        ),
        eq(messagingPermissions.status, 'active')
      )
    )
    .limit(1);

  assertOrThrow(
    existingPermission.length === 0,
    400,
    'You already have permission to message this user'
  );

  assertOrThrow(
    !(await hasPendingRequest(ctx, userId, input.recipientId)),
    400,
    'You already have a pending request to this user'
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [newRequest] = await ctx.db
    .insert(messageRequests)
    .values({
      requesterId: userId,
      recipientId: input.recipientId,
      initialMessage: input.initialMessage,
      requestReason: input.requestReason,
      requestType: input.requestType,
      status: 'pending',
      expiresAt,
      maxMessages: input.requestType === 'mentee_to_mentor' ? 1 : 3,
    })
    .returning();

  try {
    await consumeFeature({
      action: requestAction,
      userId,
      resourceType: 'message_request',
      resourceId: newRequest.id,
    });
  } catch (error) {
    toSubscriptionError(error);
  }

  const [requester] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await ctx.db.insert(notifications).values({
    userId: input.recipientId,
    type: 'MESSAGE_RECEIVED',
    title: 'New Message Request',
    message: `${requester?.name || 'Someone'} wants to send you a message`,
    relatedId: newRequest.id,
    relatedType: 'message_request',
    actionUrl: buildMessagingRequestsUrl(),
    actionText: 'View Request',
  });

  return newRequest;
}

async function createMessagingPermission(
  ctx: AuthenticatedContext,
  requesterId: string,
  recipientId: string,
  requestId: string
) {
  const existingPermission = await ctx.db
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

  const [permission] = await ctx.db
    .insert(messagingPermissions)
    .values({
      userId: requesterId,
      allowedUserId: recipientId,
      grantedViaRequestId: requestId,
      status: 'active',
    })
    .returning();

  await ctx.db.insert(messagingPermissions).values({
    userId: recipientId,
    allowedUserId: requesterId,
    grantedViaRequestId: requestId,
    status: 'active',
  });

  return permission;
}

async function createMessageThread(
  ctx: AuthenticatedContext,
  user1Id: string,
  user2Id: string
) {
  const existingThread = await ctx.db
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

  const [newThread] = await ctx.db
    .insert(messageThreads)
    .values({
      participant1Id,
      participant2Id,
      status: 'active',
    })
    .returning();

  return newThread;
}

async function handleRequest(
  ctx: AuthenticatedContext,
  input: z.infer<typeof handleRequestSchema>
) {
  const { userId } = ctx;

  const [messageRequest] = await ctx.db
    .select()
    .from(messageRequests)
    .where(eq(messageRequests.id, input.requestId))
    .limit(1);

  assertOrThrow(messageRequest, 404, 'Message request not found');
  assertOrThrow(
    messageRequest.status === 'pending',
    400,
    'Request has already been processed'
  );

  const isRecipient = messageRequest.recipientId === userId;
  const isRequester = messageRequest.requesterId === userId;

  if (input.action === 'cancel') {
    assertOrThrow(isRequester, 403, 'Only the requester can cancel');

    await ctx.db
      .update(messageRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(messageRequests.id, input.requestId));

    return { action: 'cancel' as const };
  }

  assertOrThrow(isRecipient, 403, 'Only the recipient can accept or reject');

  if (input.action === 'reject') {
    await ctx.db
      .update(messageRequests)
      .set({
        status: 'rejected',
        respondedAt: new Date(),
        responseMessage: input.responseMessage,
        updatedAt: new Date(),
      })
      .where(eq(messageRequests.id, input.requestId));

    return { action: 'reject' as const };
  }

  const permission = await createMessagingPermission(
    ctx,
    messageRequest.requesterId,
    messageRequest.recipientId,
    input.requestId
  );

  const thread = await createMessageThread(
    ctx,
    messageRequest.requesterId,
    messageRequest.recipientId
  );

  await ctx.db
    .update(messageRequests)
    .set({
      status: 'accepted',
      respondedAt: new Date(),
      responseMessage: input.responseMessage,
      updatedAt: new Date(),
    })
    .where(eq(messageRequests.id, input.requestId));

  const [initialMessage] = await ctx.db
    .insert(messages)
    .values({
      threadId: thread.id,
      senderId: messageRequest.requesterId,
      receiverId: messageRequest.recipientId,
      content: messageRequest.initialMessage,
      messageType: 'text',
      status: 'sent',
    })
    .returning();

  await ctx.db
    .update(messageThreads)
    .set({
      lastMessageId: initialMessage.id,
      lastMessageAt: initialMessage.createdAt,
      lastMessagePreview: initialMessage.content.substring(0, 100),
      participant2UnreadCount: thread.participant2Id === messageRequest.recipientId ? 1 : 0,
      participant1UnreadCount: thread.participant1Id === messageRequest.recipientId ? 1 : 0,
      totalMessages: 1,
      updatedAt: new Date(),
    })
    .where(eq(messageThreads.id, thread.id));

  const [recipient] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, messageRequest.recipientId))
    .limit(1);

  await ctx.db.insert(notifications).values({
    userId: messageRequest.requesterId,
    type: 'MESSAGE_RECEIVED',
    title: 'Message Request Accepted',
    message: `${recipient?.name || 'User'} accepted your message request`,
    relatedId: thread.id,
    relatedType: 'thread',
    actionUrl: buildMessagingThreadUrl(thread.id),
    actionText: 'Open Conversation',
  });

  return {
    action: 'accept' as const,
    permission,
    thread,
    message: initialMessage,
  };
}

async function editMessage(
  ctx: AuthenticatedContext,
  input: z.infer<typeof editMessageSchema>
) {
  const [message] = await ctx.db
    .select()
    .from(messages)
    .where(eq(messages.id, input.messageId))
    .limit(1);

  assertOrThrow(message, 404, 'Message not found');
  assertOrThrow(message.senderId === ctx.userId, 403, 'You can only edit your own messages');
  assertOrThrow(!message.isDeleted, 400, 'Cannot edit deleted messages');
  assertOrThrow(message.messageType === 'text', 400, 'Only text messages can be edited');

  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  assertOrThrow(
    messageAge <= EDIT_TIME_LIMIT_MS,
    400,
    'Messages can only be edited within 15 minutes'
  );

  let editHistory: Array<{
    content: string;
    editedAt: Date | string;
    editNumber: number;
  }> = [];

  if (message.metadata) {
    try {
      const metadata = JSON.parse(message.metadata);
      editHistory = metadata.editHistory ?? [];
    } catch {
      editHistory = [];
    }
  }

  assertOrThrow(
    editHistory.length < MAX_EDIT_COUNT,
    400,
    `Maximum ${MAX_EDIT_COUNT} edits allowed per message`
  );

  editHistory.push({
    content: message.content,
    editedAt: message.editedAt || message.createdAt,
    editNumber: editHistory.length + 1,
  });

  const [updatedMessage] = await ctx.db
    .update(messages)
    .set({
      content: input.content.trim(),
      isEdited: true,
      editedAt: new Date(),
      metadata: JSON.stringify({
        editHistory,
        lastEditedBy: ctx.userId,
        totalEdits: editHistory.length,
      }),
      updatedAt: new Date(),
    })
    .where(eq(messages.id, input.messageId))
    .returning();

  if (message.threadId) {
    const [thread] = await ctx.db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.id, message.threadId))
      .limit(1);

    if (thread && thread.lastMessageId === input.messageId) {
      await ctx.db
        .update(messageThreads)
        .set({
          lastMessagePreview: input.content.substring(0, 100),
          updatedAt: new Date(),
        })
        .where(eq(messageThreads.id, message.threadId));
    }
  }

  return updatedMessage;
}

async function deleteMessage(
  ctx: AuthenticatedContext,
  input: z.infer<typeof deleteMessageSchema>
) {
  const [message] = await ctx.db
    .select()
    .from(messages)
    .where(eq(messages.id, input.messageId))
    .limit(1);

  assertOrThrow(message, 404, 'Message not found');
  assertOrThrow(message.senderId === ctx.userId, 403, 'You can only delete your own messages');

  const [deletedMessage] = await ctx.db
    .update(messages)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      content: '[Message deleted]',
      updatedAt: new Date(),
    })
    .where(eq(messages.id, input.messageId))
    .returning();

  return deletedMessage;
}

async function checkReactionPermission(
  ctx: AuthenticatedContext,
  messageId: string
) {
  const [message] = await ctx.db
    .select({
      threadId: messages.threadId,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  assertOrThrow(message, 404, 'Message not found');
  assertOrThrow(
    message.senderId === ctx.userId || message.receiverId === ctx.userId,
    403,
    'You do not have permission to react to this message'
  );

  if (message.threadId) {
    const [thread] = await ctx.db
      .select()
      .from(messageThreads)
      .where(
        and(
          eq(messageThreads.id, message.threadId),
          or(
            eq(messageThreads.participant1Id, ctx.userId),
            eq(messageThreads.participant2Id, ctx.userId)
          )
        )
      )
      .limit(1);

    assertOrThrow(thread, 403, 'You do not have access to this thread');
  }

  const otherUserId =
    message.senderId === ctx.userId ? message.receiverId : message.senderId;

  const [permission] = await ctx.db
    .select()
    .from(messagingPermissions)
    .where(
      and(
        eq(messagingPermissions.userId, ctx.userId),
        eq(messagingPermissions.allowedUserId, otherUserId),
        eq(messagingPermissions.status, 'active')
      )
    )
    .limit(1);

  assertOrThrow(permission, 403, 'You do not have permission to interact with this user');

  return message;
}

async function listMessageReactions(
  ctx: AuthenticatedContext,
  input: z.infer<typeof listReactionsSchema>
) {
  await checkReactionPermission(ctx, input.messageId);

  const reactions = await ctx.db
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
    .where(eq(messageReactions.messageId, input.messageId));

  const groupedReactions = reactions.reduce<Record<string, any>>((acc, entry) => {
    const emoji = entry.reaction.emoji;
    if (!acc[emoji]) {
      acc[emoji] = {
        emoji,
        count: 0,
        users: [],
        hasReacted: false,
      };
    }

    acc[emoji].count += 1;
    acc[emoji].users.push(entry.user);
    if (entry.user?.id === ctx.userId) {
      acc[emoji].hasReacted = true;
    }

    return acc;
  }, {});

  return Object.values(groupedReactions);
}

async function toggleMessageReaction(
  ctx: AuthenticatedContext,
  input: z.infer<typeof toggleReactionSchema>
) {
  reactionRateLimit.check(ctx.req);
  await checkReactionPermission(ctx, input.messageId);

  const [existingReaction] = await ctx.db
    .select()
    .from(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, input.messageId),
        eq(messageReactions.userId, ctx.userId),
        eq(messageReactions.emoji, input.emoji)
      )
    )
    .limit(1);

  if (existingReaction) {
    await ctx.db
      .delete(messageReactions)
      .where(eq(messageReactions.id, existingReaction.id));

    return {
      action: 'removed' as const,
    };
  }

  const [reaction] = await ctx.db
    .insert(messageReactions)
    .values({
      messageId: input.messageId,
      userId: ctx.userId,
      emoji: input.emoji,
    })
    .returning();

  const [user] = await ctx.db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);

  return {
    action: 'added' as const,
    data: {
      reaction,
      user,
    },
  };
}

export const messagingRouter = createTRPCRouter({
  listThreads: protectedProcedure
    .input(listThreadsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listThreads(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch message threads');
      }
    }),
  getThread: protectedProcedure
    .input(getThreadInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getThread(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch thread');
      }
    }),
  updateThread: protectedProcedure
    .input(updateThreadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateThread(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update thread');
      }
    }),
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendMessage(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to send message');
      }
    }),
  listRequests: protectedProcedure
    .input(listRequestsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listRequests(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch message requests');
      }
    }),
  sendRequest: protectedProcedure
    .input(createRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendRequest(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create message request');
      }
    }),
  handleRequest: protectedProcedure
    .input(handleRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await handleRequest(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update message request');
      }
    }),
  editMessage: protectedProcedure
    .input(editMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await editMessage(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to edit message');
      }
    }),
  deleteMessage: protectedProcedure
    .input(deleteMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteMessage(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete message');
      }
    }),
  listMessageReactions: protectedProcedure
    .input(listReactionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMessageReactions(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch reactions');
      }
    }),
  toggleMessageReaction: protectedProcedure
    .input(toggleReactionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleMessageReaction(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to manage reaction');
      }
    }),
});
