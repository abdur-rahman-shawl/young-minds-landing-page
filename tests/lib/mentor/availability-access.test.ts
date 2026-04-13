import { describe, expect, it } from 'vitest';

import {
  canManageMentorAvailability,
  getMentorAvailabilityAccessState,
} from '@/lib/mentor/availability-access';

describe('getMentorAvailabilityAccessState', () => {
  it('requires a mentor profile before availability can be managed', () => {
    expect(getMentorAvailabilityAccessState(null)).toBe('profile-required');
  });

  it('requires verification before availability can be managed', () => {
    expect(
      getMentorAvailabilityAccessState({ verificationStatus: 'IN_PROGRESS' })
    ).toBe('verification-required');
  });

  it('allows access once the mentor is verified', () => {
    expect(
      getMentorAvailabilityAccessState({
        verificationStatus: 'VERIFIED',
        paymentStatus: 'COMPLETED',
      })
    ).toBe('ready');
  });
});

describe('canManageMentorAvailability', () => {
  it('allows a mentor to manage their own availability resources', () => {
    expect(
      canManageMentorAvailability({
        isAdmin: false,
        actorUserId: 'mentor-user',
        targetMentorUserId: 'mentor-user',
      })
    ).toBe(true);
  });

  it('allows admins to manage another mentor availability resource', () => {
    expect(
      canManageMentorAvailability({
        isAdmin: true,
        actorUserId: 'admin-user',
        targetMentorUserId: 'mentor-user',
      })
    ).toBe(true);
  });

  it('rejects non-admin access to another mentor availability resource', () => {
    expect(
      canManageMentorAvailability({
        isAdmin: false,
        actorUserId: 'mentor-user',
        targetMentorUserId: 'other-mentor-user',
      })
    ).toBe(false);
  });
});
