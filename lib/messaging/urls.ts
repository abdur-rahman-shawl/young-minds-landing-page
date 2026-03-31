import { buildDashboardSectionUrl } from '@/lib/dashboard/sections';

export function buildMessagingThreadUrl(threadId: string) {
  return buildDashboardSectionUrl('/dashboard', 'messages', { thread: threadId });
}

export function buildMessagingRequestsUrl() {
  return buildDashboardSectionUrl('/dashboard', 'messages', { tab: 'requests' });
}
