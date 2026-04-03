interface MentorAvailabilityAccessInput {
  verificationStatus?: string | null;
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
  if (!mentorProfile) {
    return 'profile-required';
  }

  if (mentorProfile.verificationStatus !== 'VERIFIED') {
    return 'verification-required';
  }

  return 'ready';
}

export function canManageMentorAvailability(
  input: MentorAvailabilityManagerInput
) {
  return input.isAdmin || input.actorUserId === input.targetMentorUserId;
}
