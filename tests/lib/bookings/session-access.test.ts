import { describe, expect, it } from 'vitest';

import { canViewSessionDetail } from '@/lib/bookings/session-access';

describe('session access helpers', () => {
  it('allows admins to view any session detail', () => {
    expect(
      canViewSessionDetail({
        actorUserId: 'admin-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
        isAdmin: true,
      })
    ).toBe(true);
  });

  it('allows mentor and mentee participants to view session detail', () => {
    expect(
      canViewSessionDetail({
        actorUserId: 'mentor-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
        isAdmin: false,
      })
    ).toBe(true);

    expect(
      canViewSessionDetail({
        actorUserId: 'mentee-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('blocks non-participants from viewing session detail', () => {
    expect(
      canViewSessionDetail({
        actorUserId: 'other-user',
        mentorId: 'mentor-user',
        menteeId: 'mentee-user',
        isAdmin: false,
      })
    ).toBe(false);
  });
});
