import { buildDashboardSectionUrl } from '@/lib/dashboard/sections';

type SessionDashboardRole = 'mentor' | 'mentee';

function resolveSessionSection(role: SessionDashboardRole) {
  return role === 'mentor' ? 'schedule' : 'sessions';
}

export function buildSessionDashboardLink(
  role: SessionDashboardRole,
  sessionId: string
) {
  return buildDashboardSectionUrl('/dashboard', resolveSessionSection(role), {
    sessionId,
  });
}

export function buildRescheduleResponseLink(
  role: SessionDashboardRole,
  sessionId: string
) {
  return buildDashboardSectionUrl('/dashboard', resolveSessionSection(role), {
    action: 'reschedule-response',
    sessionId,
  });
}

export function buildMentorDiscoveryLink() {
  return buildDashboardSectionUrl('/dashboard', 'explore');
}

export function buildSelectMentorLink(sessionId: string) {
  return `/sessions/${sessionId}/select-mentor`;
}
