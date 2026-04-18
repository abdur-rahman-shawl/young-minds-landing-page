import {
  buildMentorAccessPolicySnapshot,
  MENTOR_FEATURE_KEYS,
} from '@/lib/mentor/access-policy';

interface MentorAvailabilityAccessInput {
  verificationStatus?: string | null;
  paymentStatus?: string | null;
}

interface MentorAvailabilityManagerInput {
  isAdmin: boolean;
  actorUserId: string;
  targetMentorUserId: string;
}

export type MentorAvailabilityAccessState =
  | 'profile-required'
  | 'verification-required'
  | 'ready';

export function getMentorAvailabilityAccessState(
  mentorProfile: MentorAvailabilityAccessInput | null | undefined
): MentorAvailabilityAccessState {
  const policy = buildMentorAccessPolicySnapshot({
    isMentor: true,
    mentorProfile,
  });
  const availabilityAccess = policy.features[MENTOR_FEATURE_KEYS.availabilityManage];

  if (availabilityAccess.allowed) {
    return 'ready';
  }

  if (availabilityAccess.reasonCode === 'application_required') {
    return 'profile-required';
  }

  return 'verification-required';
}

export function canManageMentorAvailability(
  input: MentorAvailabilityManagerInput
) {
  return input.isAdmin || input.actorUserId === input.targetMentorUserId;
}
