import { describe, expect, it } from 'vitest';

import {
  buildMentorDiscoveryLink,
  buildRescheduleResponseLink,
  buildSelectMentorLink,
  buildSessionDashboardLink,
} from '@/lib/bookings/dashboard-links';

describe('booking dashboard links', () => {
  it('builds a mentee session link that targets the session details', () => {
    expect(buildSessionDashboardLink('mentee', 'session-123')).toBe(
      '/dashboard?section=sessions&sessionId=session-123'
    );
  });

  it('builds a mentor schedule link that targets the session details', () => {
    expect(buildSessionDashboardLink('mentor', 'session-123')).toBe(
      '/dashboard?section=schedule&sessionId=session-123'
    );
  });

  it('builds a reschedule response link for the recipient role', () => {
    expect(buildRescheduleResponseLink('mentee', 'session-123')).toBe(
      '/dashboard?section=sessions&action=reschedule-response&sessionId=session-123'
    );
    expect(buildRescheduleResponseLink('mentor', 'session-123')).toBe(
      '/dashboard?section=schedule&action=reschedule-response&sessionId=session-123'
    );
  });

  it('builds the mentor discovery and direct mentor-selection links', () => {
    expect(buildMentorDiscoveryLink()).toBe('/dashboard?section=explore');
    expect(buildSelectMentorLink('session-123')).toBe(
      '/sessions/session-123/select-mentor'
    );
  });
});
