import { describe, expect, it } from 'vitest';

import { MessagingServiceError } from '@/lib/messaging/server/errors';
import {
  assertRequestActionAllowed,
  buildAcceptedRequestThreadUpdate,
  buildRequestActionUpdate,
  buildThreadSendUpdatePayload,
  buildThreadUpdatePayload,
  resolveDirectConversationPolicy,
  resolveRequestMessageLimitState,
} from '@/lib/messaging/server/rules';

describe('messaging server rules', () => {
  it('builds send-message thread updates that only grow the receiver side', () => {
    const plan = buildThreadSendUpdatePayload({
      thread: {
        participant1Id: 'receiver',
        participant2Id: 'sender',
        participant1UnreadCount: 2,
        participant2UnreadCount: 0,
        participant1Archived: true,
        participant1ArchivedAt: new Date('2026-03-01T00:00:00.000Z'),
        participant2Archived: false,
        participant2ArchivedAt: null,
        participant1Deleted: true,
        participant1DeletedAt: new Date('2026-03-01T00:00:00.000Z'),
        participant2Deleted: false,
        participant2DeletedAt: null,
        totalMessages: 4,
      },
      receiverId: 'receiver',
      messageId: 'message-1',
      messageCreatedAt: new Date('2026-03-31T10:00:00.000Z'),
      messagePreview: 'Hello there',
    });

    expect(plan.updateData).toMatchObject({
      lastMessageId: 'message-1',
      lastMessagePreview: 'Hello there',
      participant1UnreadCount: 3,
      participant1Archived: false,
      participant1Deleted: false,
      totalMessages: 5,
    });
  });

  it('builds archive and mark-as-read thread updates deterministically', () => {
    const archivePlan = buildThreadUpdatePayload({
      action: 'archive',
      isParticipant1: true,
      now: new Date('2026-03-31T10:00:00.000Z'),
    });
    expect(archivePlan.shouldMarkMessagesAsRead).toBe(false);
    expect(archivePlan.updateData).toMatchObject({
      participant1Archived: true,
    });

    const readPlan = buildThreadUpdatePayload({
      action: 'markAsRead',
      isParticipant1: false,
      now: new Date('2026-03-31T10:00:00.000Z'),
    });
    expect(readPlan.shouldMarkMessagesAsRead).toBe(true);
    expect(readPlan.updateData).toMatchObject({
      participant2UnreadCount: 0,
    });
  });

  it('authorizes request actions and produces accepted/rejected updates', () => {
    const request = {
      requesterId: 'requester',
      recipientId: 'recipient',
      status: 'pending' as const,
    };

    expect(assertRequestActionAllowed(request, 'recipient', 'accept')).toEqual({
      isRecipient: true,
      isRequester: false,
    });

    expect(buildRequestActionUpdate('reject', 'Not a fit')).toMatchObject({
      status: 'rejected',
      responseMessage: 'Not a fit',
    });

    const acceptedThreadUpdate = buildAcceptedRequestThreadUpdate(
      {
        participant1Id: 'recipient',
        participant2Id: 'requester',
      },
      {
        requesterId: 'requester',
        recipientId: 'recipient',
      },
      {
        id: 'initial-message',
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        content: 'Initial request',
      }
    );

    expect(acceptedThreadUpdate).toMatchObject({
      lastMessageId: 'initial-message',
      participant1UnreadCount: 1,
      participant2UnreadCount: 0,
      totalMessages: 1,
    });

    expect(() =>
      assertRequestActionAllowed(request, 'requester', 'accept')
    ).toThrow(MessagingServiceError);
  });

  it('bypasses subscription enforcement for admin direct conversations', () => {
    expect(resolveDirectConversationPolicy(['admin'], ['mentee'])).toEqual({
      enforcement: 'none',
      reason: 'admin_direct',
    });
  });

  it('enforces request-backed message limits only for the requester side', () => {
    expect(
      resolveRequestMessageLimitState(
        {
          requesterId: 'requester',
          maxMessages: 1,
          messagesUsed: 0,
        },
        'requester'
      )
    ).toMatchObject({
      shouldConsume: true,
      nextMessagesUsed: 1,
      remaining: 0,
    });

    expect(
      resolveRequestMessageLimitState(
        {
          requesterId: 'requester',
          maxMessages: 1,
          messagesUsed: 1,
        },
        'recipient'
      )
    ).toMatchObject({
      shouldConsume: false,
      remaining: 0,
    });

    expect(() =>
      resolveRequestMessageLimitState(
        {
          requesterId: 'requester',
          maxMessages: 1,
          messagesUsed: 1,
        },
        'requester'
      )
    ).toThrow(MessagingServiceError);
  });
});
