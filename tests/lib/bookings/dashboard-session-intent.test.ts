import { describe, expect, it } from 'vitest';

import { findSessionFromDashboardParams } from '@/lib/bookings/dashboard-session-intent';

describe('findSessionFromDashboardParams', () => {
  const sessions = [
    { id: 'session-1', title: 'First' },
    { id: 'session-2', title: 'Second' },
  ];

  it('returns the matching session when sessionId exists in params', () => {
    const params = new URLSearchParams({
      section: 'sessions',
      sessionId: 'session-2',
      action: 'reschedule-response',
    });

    expect(findSessionFromDashboardParams(params, sessions)).toEqual(
      sessions[1]
    );
  });

  it('returns null when sessionId is missing', () => {
    const params = new URLSearchParams({ section: 'sessions' });

    expect(findSessionFromDashboardParams(params, sessions)).toBeNull();
  });

  it('returns null when the session does not exist in the loaded list', () => {
    const params = new URLSearchParams({
      section: 'sessions',
      sessionId: 'missing-session',
    });

    expect(findSessionFromDashboardParams(params, sessions)).toBeNull();
  });
});
