import type {
  MenteeAccessPolicySnapshot,
  MenteeAccessReasonCode,
  MenteeFeatureAccessDecision,
} from '@/lib/mentee/access-policy';
import {
  getMenteeFeatureDecision,
  MENTEE_FEATURE_KEYS,
} from '@/lib/mentee/access-policy';
import type {
  MentorAccessPolicySnapshot,
  MentorAccessReasonCode,
  MentorFeatureAccessDecision,
} from '@/lib/mentor/access-policy';
import {
  getMentorFeatureDecision,
  MENTOR_FEATURE_KEYS,
} from '@/lib/mentor/access-policy';

export const MESSAGING_ACCESS_INTENTS = {
  mailbox: 'mailbox',
  directMessages: 'directMessages',
  messageRequests: 'messageRequests',
} as const;

export type MessagingAccessIntent =
  (typeof MESSAGING_ACCESS_INTENTS)[keyof typeof MESSAGING_ACCESS_INTENTS];

export type MessagingAudience = 'admin' | 'mentor' | 'mentee';

export type MessagingAccessReasonCode =
  | 'ok'
  | 'messaging_access_required'
  | MentorAccessReasonCode
  | MenteeAccessReasonCode;

type MessagingFeatureDecisionSource =
  | {
      audience: 'mentor';
      feature: MentorFeatureAccessDecision;
    }
  | {
      audience: 'mentee';
      feature: MenteeFeatureAccessDecision;
    };

export type MessagingAccessDecision =
  | {
      allowed: true;
      audience: 'admin';
      reasonCode: 'ok';
      blockedSummary: string;
      label: string;
      source: null;
    }
  | {
      allowed: boolean;
      audience: 'mentor' | 'mentee';
      reasonCode: MessagingAccessReasonCode;
      blockedSummary: string;
      label: string;
      source: MessagingFeatureDecisionSource;
    }
  | {
      allowed: false;
      audience: null;
      reasonCode: 'messaging_access_required';
      blockedSummary: string;
      label: string;
      source: null;
    };

export interface MessagingAccessContext {
  isAdmin?: boolean;
  mentorAccess?: MentorAccessPolicySnapshot | null;
  menteeAccess?: MenteeAccessPolicySnapshot | null;
  preferredAudience?: Exclude<MessagingAudience, 'admin'> | null;
}

function getMentorMessagingDecision(
  access: MentorAccessPolicySnapshot | null | undefined,
  intent: MessagingAccessIntent
): MentorFeatureAccessDecision | null {
  switch (intent) {
    case MESSAGING_ACCESS_INTENTS.mailbox:
      return getMentorFeatureDecision(access, MENTOR_FEATURE_KEYS.messagesView);
    case MESSAGING_ACCESS_INTENTS.directMessages:
      return getMentorFeatureDecision(access, MENTOR_FEATURE_KEYS.directMessages);
    case MESSAGING_ACCESS_INTENTS.messageRequests:
      return getMentorFeatureDecision(access, MENTOR_FEATURE_KEYS.messageRequests);
    default:
      return null;
  }
}

function getMenteeMessagingDecision(
  access: MenteeAccessPolicySnapshot | null | undefined,
  intent: MessagingAccessIntent
): MenteeFeatureAccessDecision | null {
  switch (intent) {
    case MESSAGING_ACCESS_INTENTS.mailbox:
      return getMenteeFeatureDecision(access, MENTEE_FEATURE_KEYS.messagesView);
    case MESSAGING_ACCESS_INTENTS.directMessages:
      return getMenteeFeatureDecision(access, MENTEE_FEATURE_KEYS.directMessages);
    case MESSAGING_ACCESS_INTENTS.messageRequests:
      return getMenteeFeatureDecision(access, MENTEE_FEATURE_KEYS.messageRequests);
    default:
      return null;
  }
}

function toMessagingDecision(
  source: MessagingFeatureDecisionSource
): MessagingAccessDecision {
  return {
    allowed: source.feature.allowed,
    audience: source.audience,
    reasonCode: source.feature.reasonCode,
    blockedSummary: source.feature.blockedSummary,
    label: source.feature.label,
    source,
  };
}

function getAudienceOrder(
  preferredAudience: Exclude<MessagingAudience, 'admin'> | null | undefined
) {
  return [preferredAudience, 'mentor', 'mentee'].filter(
    (audience, index, values): audience is 'mentor' | 'mentee' =>
      Boolean(audience) && values.indexOf(audience) === index
  );
}

function getAudienceDecision(
  context: MessagingAccessContext,
  intent: MessagingAccessIntent,
  audience: Exclude<MessagingAudience, 'admin'>
): MessagingAccessDecision | null {
  if (audience === 'mentor') {
    const feature = getMentorMessagingDecision(context.mentorAccess, intent);
    return feature
      ? toMessagingDecision({
          audience: 'mentor',
          feature,
        })
      : null;
  }

  const feature = getMenteeMessagingDecision(context.menteeAccess, intent);
  return feature
    ? toMessagingDecision({
        audience: 'mentee',
        feature,
      })
    : null;
}

export function getMessagingAccessDecision(
  context: MessagingAccessContext,
  intent: MessagingAccessIntent,
  audience?: MessagingAudience | null
): MessagingAccessDecision {
  if (context.isAdmin) {
    return {
      allowed: true,
      audience: 'admin',
      reasonCode: 'ok',
      blockedSummary: 'Admin messaging access is available.',
      label: 'Messaging',
      source: null,
    };
  }

  if (audience === 'mentor' || audience === 'mentee') {
    return (
      getAudienceDecision(context, intent, audience) ?? {
        allowed: false,
        audience: null,
        reasonCode: 'messaging_access_required',
        blockedSummary:
          'Messaging requires an eligible mentor, mentee, or admin account.',
        label: 'Messaging',
        source: null,
      }
    );
  }

  const decisions = getAudienceOrder(context.preferredAudience)
    .map((candidateAudience) =>
      getAudienceDecision(context, intent, candidateAudience)
    )
    .filter((decision): decision is Exclude<MessagingAccessDecision, { audience: null }> =>
      Boolean(decision)
    );

  const allowedDecision = decisions.find((decision) => decision.allowed);

  if (allowedDecision) {
    return allowedDecision;
  }

  return (
    decisions[0] ?? {
      allowed: false,
      audience: null,
      reasonCode: 'messaging_access_required',
      blockedSummary:
        'Messaging requires an eligible mentor, mentee, or admin account.',
      label: 'Messaging',
      source: null,
    }
  );
}
