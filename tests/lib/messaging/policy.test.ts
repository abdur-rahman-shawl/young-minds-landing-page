import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveMessagingPolicy } from '../../../lib/messaging/policy.ts';
import {
  buildMessagingRequestsUrl,
  buildMessagingThreadUrl,
} from '../../../lib/messaging/urls.ts';

test('request-scoped mentee to mentor messages map to mentee direct messaging for requester', () => {
  const result = resolveMessagingPolicy({
    kind: 'request',
    requestType: 'mentee_to_mentor',
    requesterId: 'mentee-1',
    senderId: 'mentee-1',
  });

  assert.deepEqual(result, {
    enforcement: 'subscription',
    action: 'messaging.direct_message.mentee',
  });
});

test('request-scoped mentor to mentee replies map to mentee direct messaging for recipient', () => {
  const result = resolveMessagingPolicy({
    kind: 'request',
    requestType: 'mentor_to_mentee',
    requesterId: 'mentor-1',
    senderId: 'mentee-1',
  });

  assert.deepEqual(result, {
    enforcement: 'subscription',
    action: 'messaging.direct_message.mentee',
  });
});

test('admin direct conversations bypass subscription enforcement', () => {
  const result = resolveMessagingPolicy({
    kind: 'direct',
    senderRoles: ['admin'],
    receiverRoles: ['mentee'],
  });

  assert.deepEqual(result, {
    enforcement: 'none',
    reason: 'admin_direct',
  });
});

test('non-admin direct conversations fail loudly', () => {
  assert.throws(
    () =>
      resolveMessagingPolicy({
        kind: 'direct',
        senderRoles: ['mentor'],
        receiverRoles: ['mentee'],
      }),
    /Direct messaging is only supported/
  );
});

test('messaging urls target the dashboard messages section', () => {
  assert.equal(
    buildMessagingThreadUrl('thread-123'),
    '/dashboard?section=messages&thread=thread-123'
  );
  assert.equal(
    buildMessagingThreadUrl('thread with space'),
    '/dashboard?section=messages&thread=thread%20with%20space'
  );
  assert.equal(
    buildMessagingRequestsUrl(),
    '/dashboard?section=messages&tab=requests'
  );
});
