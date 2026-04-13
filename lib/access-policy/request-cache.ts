import { getUserWithRoles } from '@/lib/db/user-helpers';
import type { AccessPolicyRuntimeConfig } from '@/lib/access-policy/runtime-config';
import type { MenteeAccessPolicySnapshot } from '@/lib/mentee/access-policy';
import type { MentorAccessPolicySnapshot } from '@/lib/mentor/access-policy';
import type { MessagingAccessDecision } from '@/lib/messaging/access-policy';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

export interface AccessPolicyRequestCache {
  currentUserById: Map<string, Promise<CurrentUser | null>>;
  mentorPolicyByUserId: Map<string, Promise<MentorAccessPolicySnapshot>>;
  menteePolicyByUserId: Map<string, Promise<MenteeAccessPolicySnapshot>>;
  messagingDecisionByKey: Map<string, Promise<MessagingAccessDecision>>;
  runtimeConfig: Promise<AccessPolicyRuntimeConfig> | null;
}

export function createAccessPolicyRequestCache(): AccessPolicyRequestCache {
  return {
    currentUserById: new Map(),
    mentorPolicyByUserId: new Map(),
    menteePolicyByUserId: new Map(),
    messagingDecisionByKey: new Map(),
    runtimeConfig: null,
  };
}
