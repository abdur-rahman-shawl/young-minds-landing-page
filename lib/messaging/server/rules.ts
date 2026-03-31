import type { MessageRequest } from '@/lib/db/schema/message-requests';
import type { MessageThread } from '@/lib/db/schema/message-threads';
import { resolveMessagingPolicy } from '@/lib/messaging/policy';
import { MessagingServiceError } from './errors';

export type ThreadAction =
  | 'archive'
  | 'unarchive'
  | 'mute'
  | 'unmute'
  | 'delete'
  | 'markAsRead';

interface ThreadUpdatePayloadInput {
  action: ThreadAction;
  isParticipant1: boolean;
  muteDuration?: number;
  now?: Date;
}

export function buildThreadUpdatePayload({
  action,
  isParticipant1,
  muteDuration,
  now = new Date(),
}: ThreadUpdatePayloadInput) {
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  switch (action) {
    case 'archive':
      if (isParticipant1) {
        updateData.participant1Archived = true;
        updateData.participant1ArchivedAt = now;
      } else {
        updateData.participant2Archived = true;
        updateData.participant2ArchivedAt = now;
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
        updateData.participant1MutedUntil = muteDuration
          ? new Date(now.getTime() + muteDuration * 60 * 60 * 1000)
          : null;
      } else {
        updateData.participant2Muted = true;
        updateData.participant2MutedUntil = muteDuration
          ? new Date(now.getTime() + muteDuration * 60 * 60 * 1000)
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
        updateData.participant1DeletedAt = now;
      } else {
        updateData.participant2Deleted = true;
        updateData.participant2DeletedAt = now;
      }
      break;
    case 'markAsRead':
      if (isParticipant1) {
        updateData.participant1UnreadCount = 0;
        updateData.participant1LastReadAt = now;
      } else {
        updateData.participant2UnreadCount = 0;
        updateData.participant2LastReadAt = now;
      }
      break;
  }

  return {
    updateData,
    shouldMarkMessagesAsRead: action === 'markAsRead',
  };
}

type ThreadSendFields = Pick<
  MessageThread,
  | 'participant1Id'
  | 'participant2Id'
  | 'participant1UnreadCount'
  | 'participant2UnreadCount'
  | 'participant1Archived'
  | 'participant1ArchivedAt'
  | 'participant2Archived'
  | 'participant2ArchivedAt'
  | 'participant1Deleted'
  | 'participant1DeletedAt'
  | 'participant2Deleted'
  | 'participant2DeletedAt'
  | 'totalMessages'
>;

interface ThreadSendUpdatePayloadInput {
  thread: ThreadSendFields;
  receiverId: string;
  messageId: string;
  messageCreatedAt: Date;
  messagePreview: string;
  now?: Date;
}

export function buildThreadSendUpdatePayload({
  thread,
  receiverId,
  messageId,
  messageCreatedAt,
  messagePreview,
  now = new Date(),
}: ThreadSendUpdatePayloadInput) {
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

  return {
    updateData: {
      status: 'active',
      lastMessageId: messageId,
      lastMessageAt: messageCreatedAt,
      lastMessagePreview: messagePreview.substring(0, 100),
      [unreadCountField]: nextUnreadCount,
      [receiverArchivedField]: false,
      [receiverArchivedAtField]: null,
      [receiverDeletedField]: false,
      [receiverDeletedAtField]: null,
      totalMessages: (thread.totalMessages ?? 0) + 1,
      updatedAt: now,
    },
  };
}

export function resolveDirectConversationPolicy(
  senderRoles: string[],
  receiverRoles: string[]
) {
  return resolveMessagingPolicy({
    kind: 'direct',
    senderRoles,
    receiverRoles,
  });
}

type RequestAction = 'accept' | 'reject' | 'cancel';

export function assertRequestActionAllowed(
  request: Pick<MessageRequest, 'requesterId' | 'recipientId' | 'status'>,
  userId: string,
  action: RequestAction
) {
  if (request.status !== 'pending') {
    throw new MessagingServiceError(400, 'Request has already been processed');
  }

  const isRecipient = request.recipientId === userId;
  const isRequester = request.requesterId === userId;

  if (action === 'cancel') {
    if (!isRequester) {
      throw new MessagingServiceError(403, 'Only the requester can cancel');
    }

    return { isRecipient, isRequester };
  }

  if (!isRecipient) {
    throw new MessagingServiceError(
      403,
      'Only the recipient can accept or reject'
    );
  }

  return { isRecipient, isRequester };
}

export function buildRequestActionUpdate(
  action: RequestAction,
  responseMessage?: string,
  now = new Date()
) {
  if (action === 'cancel') {
    return {
      status: 'cancelled' as const,
      updatedAt: now,
    };
  }

  return {
    status: action === 'accept' ? ('accepted' as const) : ('rejected' as const),
    respondedAt: now,
    responseMessage,
    updatedAt: now,
  };
}

type AcceptedThreadFields = Pick<MessageThread, 'participant1Id' | 'participant2Id'>;
type AcceptedRequestFields = Pick<MessageRequest, 'requesterId' | 'recipientId'>;

export function buildAcceptedRequestThreadUpdate(
  thread: AcceptedThreadFields,
  request: AcceptedRequestFields,
  initialMessage: { id: string; createdAt: Date; content: string },
  now = new Date()
) {
  return {
    lastMessageId: initialMessage.id,
    lastMessageAt: initialMessage.createdAt,
    lastMessagePreview: initialMessage.content.substring(0, 100),
    participant2UnreadCount: thread.participant2Id === request.recipientId ? 1 : 0,
    participant1UnreadCount: thread.participant1Id === request.recipientId ? 1 : 0,
    totalMessages: 1,
    updatedAt: now,
  };
}

export function resolveRequestMessageLimitState(
  request: Pick<MessageRequest, 'requesterId' | 'maxMessages' | 'messagesUsed'>,
  senderId: string
) {
  const senderIsRequester = request.requesterId === senderId;
  const maxMessages = request.maxMessages ?? 0;
  const messagesUsed = request.messagesUsed ?? 0;

  if (!senderIsRequester) {
    return {
      shouldConsume: false,
      maxMessages,
      messagesUsed,
      remaining: Math.max(maxMessages - messagesUsed, 0),
    };
  }

  if (maxMessages <= 0) {
    throw new MessagingServiceError(
      403,
      'This request does not allow follow-up messages',
      {
        maxMessages,
        messagesUsed,
      }
    );
  }

  if (messagesUsed >= maxMessages) {
    throw new MessagingServiceError(
      403,
      'Message limit for this request has been reached',
      {
        maxMessages,
        messagesUsed,
      }
    );
  }

  return {
    shouldConsume: true,
    nextMessagesUsed: messagesUsed + 1,
    maxMessages,
    messagesUsed,
    remaining: maxMessages - messagesUsed - 1,
  };
}
