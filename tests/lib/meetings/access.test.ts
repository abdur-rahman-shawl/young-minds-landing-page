import { describe, expect, it } from 'vitest';

import {
  resolveMeetingJoinWindow,
  resolveMeetingParticipantRole,
} from '@/lib/meetings/access';

describe('meeting access helpers', () => {
  it('resolves the correct participant role', () => {
    expect(
      resolveMeetingParticipantRole({
        userId: 'mentor-1',
        mentorId: 'mentor-1',
        menteeId: 'mentee-1',
      })
    ).toBe('mentor');

    expect(
      resolveMeetingParticipantRole({
        userId: 'mentee-1',
        mentorId: 'mentor-1',
        menteeId: 'mentee-1',
      })
    ).toBe('mentee');

    expect(
      resolveMeetingParticipantRole({
        userId: 'outsider-1',
        mentorId: 'mentor-1',
        menteeId: 'mentee-1',
      })
    ).toBeNull();
  });

  it('marks join attempts before the early window as too early', () => {
    const result = resolveMeetingJoinWindow({
      scheduledAt: '2026-04-13T12:00:00.000Z',
      now: new Date('2026-04-13T11:30:00.000Z'),
      earlyJoinMinutes: 15,
      lateJoinMaxHours: 2,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'too_early',
        minutesUntil: 15,
      })
    );
  });

  it('marks join attempts after the late window as expired', () => {
    const result = resolveMeetingJoinWindow({
      scheduledAt: '2026-04-13T12:00:00.000Z',
      now: new Date('2026-04-13T14:01:00.000Z'),
      earlyJoinMinutes: 15,
      lateJoinMaxHours: 2,
    });

    expect(result.status).toBe('expired');
  });

  it('allows joins inside the valid meeting window', () => {
    const result = resolveMeetingJoinWindow({
      scheduledAt: '2026-04-13T12:00:00.000Z',
      now: new Date('2026-04-13T12:30:00.000Z'),
      earlyJoinMinutes: 15,
      lateJoinMaxHours: 2,
    });

    expect(result.status).toBe('ok');
  });
});
