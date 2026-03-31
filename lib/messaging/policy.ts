type RequestMessageType = 'mentor_to_mentee' | 'mentee_to_mentor';

type RequestScopedMessagingPolicyInput = {
  kind: 'request';
  requestType: RequestMessageType;
  requesterId: string;
  senderId: string;
};

type DirectMessagingPolicyInput = {
  kind: 'direct';
  senderRoles: string[];
  receiverRoles: string[];
};

export type ResolveMessagingPolicyInput =
  | RequestScopedMessagingPolicyInput
  | DirectMessagingPolicyInput;

export type ResolveMessagingPolicyResult =
  | {
      enforcement: 'subscription';
      action:
        | 'messaging.direct_message.mentor'
        | 'messaging.direct_message.mentee';
    }
  | {
      enforcement: 'none';
      reason: 'admin_direct';
    };

export function resolveMessagingPolicy(
  input: ResolveMessagingPolicyInput
): ResolveMessagingPolicyResult {
  if (input.kind === 'direct') {
    const senderIsAdmin = input.senderRoles.includes('admin');
    const receiverIsAdmin = input.receiverRoles.includes('admin');

    if (senderIsAdmin || receiverIsAdmin) {
      return {
        enforcement: 'none',
        reason: 'admin_direct',
      };
    }

    throw new Error(
      'Direct messaging is only supported for conversations with an admin participant'
    );
  }

  const senderIsRequester = input.requesterId === input.senderId;

  if (input.requestType === 'mentor_to_mentee') {
    return {
      enforcement: 'subscription',
      action: senderIsRequester
        ? 'messaging.direct_message.mentor'
        : 'messaging.direct_message.mentee',
    };
  }

  return {
    enforcement: 'subscription',
    action: senderIsRequester
      ? 'messaging.direct_message.mentee'
      : 'messaging.direct_message.mentor',
  };
}
