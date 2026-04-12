import { describe, expect, it } from 'vitest';
import { resolveMessagingPolicy } from '@/lib/messaging/policy';
import {
  buildMessagingRequestsUrl,
  buildMessagingThreadUrl,
} from '@/lib/messaging/urls';

describe('resolveMessagingPolicy', () => {
  it('maps request-scoped mentee to mentor messages to mentee direct messaging for the requester', () => {
    const result = resolveMessagingPolicy({
      kind: 'request',
      requestType: 'mentee_to_mentor',
      requesterId: 'mentee-1',
      senderId: 'mentee-1',
    });

    expect(result).toEqual({
      enforcement: 'subscription',
      action: 'messaging.direct_message.mentee',
    });
  });

  it('maps mentor to mentee replies to mentee direct messaging for the recipient', () => {
    const result = resolveMessagingPolicy({
      kind: 'request',
      requestType: 'mentor_to_mentee',
      requesterId: 'mentor-1',
      senderId: 'mentee-1',
    });

    expect(result).toEqual({
      enforcement: 'subscription',
      action: 'messaging.direct_message.mentee',
    });
  });

  it('bypasses subscription enforcement for admin direct conversations', () => {
    const result = resolveMessagingPolicy({
      kind: 'direct',
      senderRoles: ['admin'],
      receiverRoles: ['mentee'],
    });

    expect(result).toEqual({
      enforcement: 'none',
      reason: 'admin_direct',
    });
  });

  it('fails loudly for unsupported non-admin direct conversations', () => {
    expect(() =>
      resolveMessagingPolicy({
        kind: 'direct',
        senderRoles: ['mentor'],
        receiverRoles: ['mentee'],
      })
    ).toThrow(/Direct messaging is only supported/);
  });
});

describe('messaging urls', () => {
  it('targets the dashboard messages section', () => {
    expect(buildMessagingThreadUrl('thread-123')).toBe(
      '/dashboard?section=messages&thread=thread-123'
    );
    expect(buildMessagingThreadUrl('thread with space')).toBe(
      '/dashboard?section=messages&thread=thread%20with%20space'
    );
    expect(buildMessagingRequestsUrl()).toBe(
      '/dashboard?section=messages&tab=requests'
    );
  });
});
