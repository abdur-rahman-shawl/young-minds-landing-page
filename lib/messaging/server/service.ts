import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  AccessPolicyError,
  assertMessagingAccess as assertSharedMessagingAccess,
} from '@/lib/access-policy/server';
import { getUserWithRoles } from '@/lib/db/user-helpers';
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
import {
  MESSAGING_ACCESS_INTENTS,
  type MessagingAccessIntent,
  type MessagingAudience,
} from '@/lib/messaging/access-policy';
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
import { MessagingServiceError, assertMessaging } from './errors';
import {
  buildAcceptedRequestThreadUpdate,
  buildRequestActionUpdate,
  buildThreadSendUpdatePayload,
  buildThreadUpdatePayload,
  resolveDirectConversationPolicy,
  resolveRequestMessageLimitState,
  assertRequestActionAllowed,
} from './rules';
import { z } from 'zod';
import {
  createRequestSchema,
  deleteMessageSchema,
  editMessageSchema,
  getThreadInputSchema,
  handleRequestSchema,
  listReactionsSchema,
  listRequestsInputSchema,
  listThreadsInputSchema,
  sendMessageSchema,
  startAdminConversationSchema,
  toggleReactionSchema,
  updateThreadSchema,
} from './schemas';

type DbClient = typeof import('@/lib/db').db;
type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export interface MessagingActorContext {
  db: DbClient;
  userId: string;
}

export interface MessagingRequestContext extends MessagingActorContext {
  req: Request;
}

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

function toSubscriptionError(error: unknown): never {
  if (isSubscriptionPolicyError(error)) {
    const message =
      typeof error.payload?.error === 'string'
        ? error.payload.error
        : 'Subscription policy prevented this action';

    throw new MessagingServiceError(error.status, message, error.payload);
  }

  throw error;
}

function getMessagingAudienceFromRequestType(
  requestType: z.infer<typeof createRequestSchema>['requestType']
): Exclude<MessagingAudience, 'admin'> {
  return requestType === 'mentor_to_mentee' ? 'mentor' : 'mentee';
}

function getMessagingAudienceFromDirectAction(
  action:
    | 'messaging.direct_message.mentor'
    | 'messaging.direct_message.mentee'
): Exclude<MessagingAudience, 'admin'> {
  return action.endsWith('.mentor') ? 'mentor' : 'mentee';
}

async function assertMessagingAccess(
  userId: string,
  intent: MessagingAccessIntent,
  options?: {
    audience?: MessagingAudience | null;
    preferredAudience?: Exclude<MessagingAudience, 'admin'> | null;
    currentUser?: CurrentUser;
  }
) {
  try {
    const result = await assertSharedMessagingAccess({
      userId,
      intent,
      audience: options?.audience,
      preferredAudience: options?.preferredAudience,
      currentUser: options?.currentUser,
      source: `messaging.${intent}`,
    });

    return result.access;
  } catch (error) {
    if (error instanceof AccessPolicyError) {
      throw new MessagingServiceError(error.status, error.message, error.data);
    }

    throw error;
  }
}

async function ensureDirectPermission(
  ctx: MessagingActorContext,
  userId: string,
  allowedUserId: string
) {
  const [existingPermission] = await ctx.db
    .select()
    .from(messagingPermissions)
    .where(
      and(
        eq(messagingPermissions.userId, userId),
        eq(messagingPermissions.allowedUserId, allowedUserId)
      )
    )
    .limit(1);

  if (existingPermission) {
    await ctx.db
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
      .where(eq(messagingPermissions.id, existingPermission.id));

    return existingPermission;
  }

  const [permission] = await ctx.db
    .insert(messagingPermissions)
    .values({
      userId,
      allowedUserId,
      status: 'active',
      grantedViaRequestId: null,
    })
    .returning();

  return permission;
}

async function restoreThreadVisibilityForParticipant(
  ctx: MessagingActorContext,
  thread: Pick<
    typeof messageThreads.$inferSelect,
    | 'id'
    | 'participant1Id'
    | 'participant2Id'
    | 'participant1Archived'
    | 'participant1Deleted'
    | 'participant2Archived'
    | 'participant2Deleted'
  >,
  userId: string
) {
  const isParticipant1 = thread.participant1Id === userId;
  const isParticipant2 = thread.participant2Id === userId;

  if (!isParticipant1 && !isParticipant2) {
    return;
  }

  const archived = isParticipant1 ? thread.participant1Archived : thread.participant2Archived;
  const deleted = isParticipant1 ? thread.participant1Deleted : thread.participant2Deleted;

  if (!archived && !deleted) {
    return;
  }

  await ctx.db
    .update(messageThreads)
    .set(
      isParticipant1
        ? {
            participant1Deleted: false,
            participant1DeletedAt: null,
            participant1Archived: false,
            participant1ArchivedAt: null,
            updatedAt: new Date(),
          }
        : {
            participant2Deleted: false,
            participant2DeletedAt: null,
            participant2Archived: false,
            participant2ArchivedAt: null,
            updatedAt: new Date(),
          }
    )
    .where(eq(messageThreads.id, thread.id));
}

export async function listThreads(
  ctx: MessagingActorContext,
  input: z.infer<typeof listThreadsInputSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const permissions = await ctx.db
    .select()
    .from(messagingPermissions)
    .where(
      and(
        eq(messagingPermissions.userId, ctx.userId),
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
          WHEN ${messageThreads.participant1Id} = ${ctx.userId}
          THEN ${messageThreads.participant1UnreadCount}
          ELSE ${messageThreads.participant2UnreadCount}
        END
      `,
      isArchived: sql<boolean>`
        CASE
          WHEN ${messageThreads.participant1Id} = ${ctx.userId}
          THEN ${messageThreads.participant1Archived}
          ELSE ${messageThreads.participant2Archived}
        END
      `,
      isMuted: sql<boolean>`
        CASE
          WHEN ${messageThreads.participant1Id} = ${ctx.userId}
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
          eq(messageThreads.participant1Id, ctx.userId),
          eq(messageThreads.participant2Id, users.id)
        ),
        and(
          eq(messageThreads.participant2Id, ctx.userId),
          eq(messageThreads.participant1Id, users.id)
        )
      )
    )
    .where(
      and(
        or(
          eq(messageThreads.participant1Id, ctx.userId),
          eq(messageThreads.participant2Id, ctx.userId)
        ),
        eq(messageThreads.status, 'active'),
        or(
          and(
            eq(messageThreads.participant1Id, ctx.userId),
            eq(messageThreads.participant1Deleted, false),
            input.includeArchived ? sql`true` : eq(messageThreads.participant1Archived, false)
          ),
          and(
            eq(messageThreads.participant2Id, ctx.userId),
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

export async function getThread(
  ctx: MessagingActorContext,
  input: z.infer<typeof getThreadInputSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const [thread] = await ctx.db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.id, input.threadId),
        or(
          eq(messageThreads.participant1Id, ctx.userId),
          eq(messageThreads.participant2Id, ctx.userId)
        )
      )
    )
    .limit(1);

  assertMessaging(thread, 404, 'Thread not found');

  const otherUserId =
    thread.participant1Id === ctx.userId ? thread.participant2Id : thread.participant1Id;

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

  assertMessaging(permission, 403, 'You do not have permission to view this thread');

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
  const reactionsMap: Record<string, any[]> = {};

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
        if (user.id === ctx.userId) {
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
    (entry) => entry.message.receiverId === ctx.userId && !entry.message.isRead
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
          eq(messages.receiverId, ctx.userId),
          eq(messages.isRead, false)
        )
      );

    await ctx.db
      .update(messageThreads)
      .set(
        buildThreadUpdatePayload({
          action: 'markAsRead',
          isParticipant1: thread.participant1Id === ctx.userId,
        }).updateData
      )
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

export async function updateThread(
  ctx: MessagingActorContext,
  input: z.infer<typeof updateThreadSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const [thread] = await ctx.db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.id, input.threadId),
        or(
          eq(messageThreads.participant1Id, ctx.userId),
          eq(messageThreads.participant2Id, ctx.userId)
        )
      )
    )
    .limit(1);

  assertMessaging(thread, 404, 'Thread not found');

  const updatePlan = buildThreadUpdatePayload({
    action: input.action,
    isParticipant1: thread.participant1Id === ctx.userId,
    muteDuration: input.muteDuration,
  });

  if (updatePlan.shouldMarkMessagesAsRead) {
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
          eq(messages.receiverId, ctx.userId),
          eq(messages.isRead, false)
        )
      );
  }

  await ctx.db
    .update(messageThreads)
    .set(updatePlan.updateData)
    .where(eq(messageThreads.id, input.threadId));

  return {
    action: input.action,
  };
}

export async function sendMessage(
  ctx: MessagingRequestContext,
  input: z.infer<typeof sendMessageSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);
  messageRateLimit.check(ctx.req as any);

  const [thread] = await ctx.db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.id, input.threadId),
        or(
          eq(messageThreads.participant1Id, ctx.userId),
          eq(messageThreads.participant2Id, ctx.userId)
        )
      )
    )
    .limit(1);

  assertMessaging(thread, 404, 'Thread not found');

  const receiverId =
    thread.participant1Id === ctx.userId ? thread.participant2Id : thread.participant1Id;

  const [permission] = await ctx.db
    .select()
    .from(messagingPermissions)
    .where(
      and(
        eq(messagingPermissions.userId, ctx.userId),
        eq(messagingPermissions.allowedUserId, receiverId),
        eq(messagingPermissions.status, 'active'),
        eq(messagingPermissions.blockedByUser, false),
        eq(messagingPermissions.blockedByAllowedUser, false)
      )
    )
    .limit(1);

  assertMessaging(
    permission,
    403,
    'You do not have permission to send messages to this user'
  );

  let directMessageAction:
    | 'messaging.direct_message.mentor'
    | 'messaging.direct_message.mentee'
    | null = null;
  let requestMessageLimitState:
    | ReturnType<typeof resolveRequestMessageLimitState>
    | null = null;

  if (permission.grantedViaRequestId) {
    const [permissionRequest] = await ctx.db
      .select()
      .from(messageRequests)
      .where(eq(messageRequests.id, permission.grantedViaRequestId))
      .limit(1);

    assertMessaging(
      permissionRequest,
      500,
      'Unable to resolve messaging audience for this thread'
    );
    assertMessaging(
      permissionRequest.status === 'accepted',
      400,
      'This messaging request is no longer active'
    );

    const policy = resolveMessagingPolicy({
      kind: 'request',
      requestType: permissionRequest.requestType,
      requesterId: permissionRequest.requesterId,
      senderId: ctx.userId,
    });

    assertMessaging(
      policy.enforcement === 'subscription',
      500,
      'Unexpected direct-messaging policy for request-backed thread'
    );

    directMessageAction = policy.action;

    await assertMessagingAccess(
      ctx.userId,
      MESSAGING_ACCESS_INTENTS.directMessages,
      {
        audience: getMessagingAudienceFromDirectAction(directMessageAction),
      }
    );

    try {
      await enforceFeature({
        action: directMessageAction,
        userId: ctx.userId,
      });
    } catch (error) {
      toSubscriptionError(error);
    }

    requestMessageLimitState = resolveRequestMessageLimitState(
      permissionRequest,
      ctx.userId
    );
  } else {
    const [sender, receiver] = await Promise.all([
      getUserWithRoles(ctx.userId),
      getUserWithRoles(receiverId),
    ]);

    assertMessaging(sender, 404, 'Unable to resolve conversation participants');
    assertMessaging(receiver, 404, 'Unable to resolve conversation participants');

    resolveDirectConversationPolicy(
      sender.roles.map((role: { name: string }) => role.name),
      receiver.roles.map((role: { name: string }) => role.name)
    );
  }

  const [newMessage] = await ctx.db
    .insert(messages)
    .values({
      threadId: input.threadId,
      senderId: ctx.userId,
      receiverId,
      content: input.content.trim(),
      messageType: input.attachmentUrl ? 'file' : 'text',
      status: 'sent',
      isDelivered: true,
      deliveredAt: new Date(),
      replyToId: input.replyToId,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      attachmentSize: input.attachmentSize,
      attachmentName: input.attachmentName,
    })
    .returning();

  if (directMessageAction) {
    try {
      await consumeFeature({
        action: directMessageAction,
        userId: ctx.userId,
        resourceType: 'message',
        resourceId: newMessage.id,
      });
    } catch (error) {
      toSubscriptionError(error);
    }
  }

  if (requestMessageLimitState?.shouldConsume) {
    await ctx.db
      .update(messageRequests)
      .set({
        messagesUsed: requestMessageLimitState.nextMessagesUsed,
        updatedAt: new Date(),
      })
      .where(eq(messageRequests.id, permission.grantedViaRequestId!));
  }

  await ctx.db
    .update(messageThreads)
    .set(
      buildThreadSendUpdatePayload({
        thread,
        receiverId,
        messageId: newMessage.id,
        messageCreatedAt: newMessage.createdAt,
        messagePreview: input.content,
      }).updateData
    )
    .where(eq(messageThreads.id, input.threadId));

  await ctx.db
    .update(messagingPermissions)
    .set({
      messagesExchanged: (permission.messagesExchanged ?? 0) + 1,
      lastMessageAt: newMessage.createdAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messagingPermissions.userId, ctx.userId),
        eq(messagingPermissions.allowedUserId, receiverId)
      )
    );

  const [sender] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);

  const isReceiverMuted =
    thread.participant1Id === receiverId ? thread.participant1Muted : thread.participant2Muted;

  if (!isReceiverMuted) {
    await ctx.db.insert(notifications).values({
      userId: receiverId,
      type: 'MESSAGE_RECEIVED',
      title: 'New Message',
      message: `${sender?.name || 'Someone'} sent you a message`,
      relatedId: input.threadId,
      relatedType: 'thread',
      actionUrl: buildMessagingThreadUrl(input.threadId),
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

export async function listRequests(
  ctx: MessagingActorContext,
  input: z.infer<typeof listRequestsInputSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

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
  ctx: MessagingActorContext,
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

export async function sendRequest(
  ctx: MessagingActorContext,
  input: z.infer<typeof createRequestSchema>
) {
  await assertMessagingAccess(
    ctx.userId,
    MESSAGING_ACCESS_INTENTS.messageRequests,
    {
      audience: getMessagingAudienceFromRequestType(input.requestType),
    }
  );

  assertMessaging(
    input.recipientId !== ctx.userId,
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
      userId: ctx.userId,
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
            eq(messagingPermissions.userId, ctx.userId),
            eq(messagingPermissions.allowedUserId, input.recipientId)
          ),
          and(
            eq(messagingPermissions.userId, input.recipientId),
            eq(messagingPermissions.allowedUserId, ctx.userId)
          )
        ),
        eq(messagingPermissions.status, 'active')
      )
    )
    .limit(1);

  assertMessaging(
    existingPermission.length === 0,
    400,
    'You already have permission to message this user'
  );
  assertMessaging(
    !(await hasPendingRequest(ctx, ctx.userId, input.recipientId)),
    400,
    'You already have a pending request to this user'
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [newRequest] = await ctx.db
    .insert(messageRequests)
    .values({
      requesterId: ctx.userId,
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
      userId: ctx.userId,
      resourceType: 'message_request',
      resourceId: newRequest.id,
    });
  } catch (error) {
    toSubscriptionError(error);
  }

  const [requester] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, ctx.userId))
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

export async function createMessagingPermission(
  ctx: MessagingActorContext,
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

export async function createMessageThread(
  ctx: MessagingActorContext,
  user1Id: string,
  user2Id: string
) {
  const [existingThread] = await ctx.db
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

  if (existingThread) {
    return existingThread;
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

export async function startAdminConversation(
  ctx: MessagingRequestContext,
  input: z.infer<typeof startAdminConversationSchema>
) {
  assertMessaging(
    input.recipientId !== ctx.userId,
    400,
    'You cannot message yourself'
  );

  const [sender, recipient] = await Promise.all([
    getUserWithRoles(ctx.userId),
    getUserWithRoles(input.recipientId),
  ]);

  assertMessaging(sender, 404, 'Sender not found');
  assertMessaging(recipient, 404, 'Recipient not found');

  const senderRoles = new Set(
    sender.roles.map((role: { name: string }) => role.name)
  );
  assertMessaging(senderRoles.has('admin'), 403, 'Only admins can initiate direct conversations');
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox, {
    currentUser: sender,
  });

  const recipientRoles = new Set(
    recipient.roles.map((role: { name: string }) => role.name)
  );
  assertMessaging(
    recipientRoles.has('mentor') || recipientRoles.has('mentee'),
    400,
    'Admins can only initiate conversations with mentors or mentees'
  );

  await Promise.all([
    ensureDirectPermission(ctx, ctx.userId, recipient.id),
    ensureDirectPermission(ctx, recipient.id, ctx.userId),
  ]);

  const thread = await createMessageThread(ctx, ctx.userId, recipient.id);

  await Promise.all([
    restoreThreadVisibilityForParticipant(ctx, thread, ctx.userId),
    restoreThreadVisibilityForParticipant(ctx, thread, recipient.id),
  ]);

  const messageResult = await sendMessage(ctx, {
    threadId: thread.id,
    content: input.content,
  });

  const adminDisplayName = sender.name?.trim() || 'Admin';
  const [latestNotification] = await ctx.db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, recipient.id),
        eq(notifications.relatedId, thread.id),
        eq(notifications.relatedType, 'thread'),
        eq(notifications.type, 'MESSAGE_RECEIVED')
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  if (latestNotification) {
    await ctx.db
      .update(notifications)
      .set({
        title: `New message from ${adminDisplayName}`,
        message: `${adminDisplayName} sent you a message`,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, latestNotification.id));
  }

  return {
    threadId: thread.id,
    ...messageResult,
  };
}

export async function getMessageRequest(
  ctx: MessagingActorContext,
  requestId: string
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const [messageRequest] = await ctx.db
    .select({
      request: messageRequests,
      requester: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(messageRequests)
    .leftJoin(users, eq(messageRequests.requesterId, users.id))
    .where(eq(messageRequests.id, requestId))
    .limit(1);

  assertMessaging(messageRequest, 404, 'Message request not found');
  assertMessaging(
    messageRequest.request.requesterId === ctx.userId ||
      messageRequest.request.recipientId === ctx.userId,
    403,
    'You do not have permission to view this request'
  );
  return messageRequest;
}

export async function handleRequest(
  ctx: MessagingActorContext,
  input: z.infer<typeof handleRequestSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const [messageRequest] = await ctx.db
    .select()
    .from(messageRequests)
    .where(eq(messageRequests.id, input.requestId))
    .limit(1);

  assertMessaging(messageRequest, 404, 'Message request not found');
  assertRequestActionAllowed(messageRequest, ctx.userId, input.action);

  if (input.action === 'cancel') {
    await ctx.db
      .update(messageRequests)
      .set(buildRequestActionUpdate('cancel'))
      .where(eq(messageRequests.id, input.requestId));

    return { action: 'cancel' as const };
  }

  if (input.action === 'reject') {
    await ctx.db
      .update(messageRequests)
      .set(buildRequestActionUpdate('reject', input.responseMessage))
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
    .set(buildRequestActionUpdate('accept', input.responseMessage))
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
    .set(buildAcceptedRequestThreadUpdate(thread, messageRequest, initialMessage))
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

export async function editMessage(
  ctx: MessagingActorContext,
  input: z.infer<typeof editMessageSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const [message] = await ctx.db
    .select()
    .from(messages)
    .where(eq(messages.id, input.messageId))
    .limit(1);

  assertMessaging(message, 404, 'Message not found');
  assertMessaging(message.senderId === ctx.userId, 403, 'You can only edit your own messages');
  assertMessaging(!message.isDeleted, 400, 'Cannot edit deleted messages');
  assertMessaging(message.messageType === 'text', 400, 'Only text messages can be edited');

  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  assertMessaging(
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

  assertMessaging(
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

export async function deleteMessage(
  ctx: MessagingActorContext,
  input: z.infer<typeof deleteMessageSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);

  const [message] = await ctx.db
    .select()
    .from(messages)
    .where(eq(messages.id, input.messageId))
    .limit(1);

  assertMessaging(message, 404, 'Message not found');
  assertMessaging(message.senderId === ctx.userId, 403, 'You can only delete your own messages');

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
  ctx: MessagingActorContext,
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

  assertMessaging(message, 404, 'Message not found');
  assertMessaging(
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

    assertMessaging(thread, 403, 'You do not have access to this thread');
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

  assertMessaging(permission, 403, 'You do not have permission to interact with this user');

  return message;
}

export async function listMessageReactions(
  ctx: MessagingActorContext,
  input: z.infer<typeof listReactionsSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);
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

export async function toggleMessageReaction(
  ctx: MessagingRequestContext,
  input: z.infer<typeof toggleReactionSchema>
) {
  await assertMessagingAccess(ctx.userId, MESSAGING_ACCESS_INTENTS.mailbox);
  reactionRateLimit.check(ctx.req as any);
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
