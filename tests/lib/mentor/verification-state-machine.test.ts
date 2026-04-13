import { describe, expect, it } from 'vitest';

import { resolveMentorVerificationTransition } from '@/lib/mentor/verification-state-machine';

describe('mentor verification state machine', () => {
  it('starts new mentor applications in progress', () => {
    expect(
      resolveMentorVerificationTransition(null, 'application_submitted')
    ).toBe('IN_PROGRESS');
  });

  it('moves reverification back to review on resubmission', () => {
    expect(
      resolveMentorVerificationTransition(
        'REVERIFICATION',
        'application_resubmitted'
      )
    ).toBe('RESUBMITTED');
  });

  it('moves verified mentors into updated-profile review on profile edits', () => {
    expect(
      resolveMentorVerificationTransition('VERIFIED', 'profile_updated')
    ).toBe('UPDATED_PROFILE');
  });

  it('keeps in-progress applications in progress on profile edits', () => {
    expect(
      resolveMentorVerificationTransition('IN_PROGRESS', 'profile_updated')
    ).toBe('IN_PROGRESS');
  });

  it('fails loudly on invalid transitions', () => {
    expect(() =>
      resolveMentorVerificationTransition('YET_TO_APPLY', 'admin_verified')
    ).toThrow('Invalid mentor verification transition');
  });
});
