import type { VerificationStatus } from '@/lib/db/schema/mentors';

export type MentorVerificationTransitionEvent =
  | 'application_submitted'
  | 'application_resubmitted'
  | 'profile_updated'
  | 'admin_verified'
  | 'admin_rejected'
  | 'admin_reverification_requested';

const MENTOR_VERIFICATION_TRANSITIONS: Record<
  VerificationStatus,
  Partial<Record<MentorVerificationTransitionEvent, VerificationStatus>>
> = {
  YET_TO_APPLY: {
    application_submitted: 'IN_PROGRESS',
    profile_updated: 'YET_TO_APPLY',
  },
  IN_PROGRESS: {
    application_resubmitted: 'RESUBMITTED',
    profile_updated: 'IN_PROGRESS',
    admin_verified: 'VERIFIED',
    admin_rejected: 'REJECTED',
    admin_reverification_requested: 'REVERIFICATION',
  },
  VERIFIED: {
    application_resubmitted: 'RESUBMITTED',
    profile_updated: 'UPDATED_PROFILE',
    admin_rejected: 'REJECTED',
    admin_reverification_requested: 'REVERIFICATION',
  },
  REJECTED: {
    application_resubmitted: 'RESUBMITTED',
    profile_updated: 'REJECTED',
    admin_verified: 'VERIFIED',
    admin_reverification_requested: 'REVERIFICATION',
  },
  REVERIFICATION: {
    application_resubmitted: 'RESUBMITTED',
    profile_updated: 'REVERIFICATION',
    admin_verified: 'VERIFIED',
    admin_rejected: 'REJECTED',
  },
  RESUBMITTED: {
    application_resubmitted: 'RESUBMITTED',
    profile_updated: 'RESUBMITTED',
    admin_verified: 'VERIFIED',
    admin_rejected: 'REJECTED',
    admin_reverification_requested: 'REVERIFICATION',
  },
  UPDATED_PROFILE: {
    application_resubmitted: 'RESUBMITTED',
    profile_updated: 'UPDATED_PROFILE',
    admin_verified: 'VERIFIED',
    admin_rejected: 'REJECTED',
    admin_reverification_requested: 'REVERIFICATION',
  },
};

export function normalizeMentorVerificationTransitionStatus(
  status: VerificationStatus | null | undefined
): VerificationStatus {
  return status ?? 'YET_TO_APPLY';
}

export function resolveMentorVerificationTransition(
  status: VerificationStatus | null | undefined,
  event: MentorVerificationTransitionEvent
): VerificationStatus {
  const currentStatus = normalizeMentorVerificationTransitionStatus(status);
  const nextStatus = MENTOR_VERIFICATION_TRANSITIONS[currentStatus]?.[event];

  if (!nextStatus) {
    throw new Error(
      `Invalid mentor verification transition: ${currentStatus} -> ${event}`
    );
  }

  return nextStatus;
}
