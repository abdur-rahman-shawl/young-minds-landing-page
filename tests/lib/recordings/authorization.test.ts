import { describe, expect, it } from 'vitest';

import { resolveRecordingPlaybackAccess } from '@/lib/recordings/authorization';

describe('resolveRecordingPlaybackAccess', () => {
  it('returns mentor access for the mentor participant', () => {
    expect(
      resolveRecordingPlaybackAccess({
        userId: 'mentor-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
      })
    ).toBe('recordings.access.mentor');
  });

  it('returns mentee access for the mentee participant', () => {
    expect(
      resolveRecordingPlaybackAccess({
        userId: 'mentee-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
      })
    ).toBe('recordings.access.mentee');
  });

  it('throws for non-participants', () => {
    expect(() =>
      resolveRecordingPlaybackAccess({
        userId: 'intruder-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
      })
    ).toThrowError('Only session participants can access recordings');
  });
});
