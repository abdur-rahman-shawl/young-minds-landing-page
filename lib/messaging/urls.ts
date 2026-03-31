export function buildMessagingThreadUrl(threadId: string) {
  return `/dashboard?section=messages&thread=${encodeURIComponent(threadId)}`;
}

export function buildMessagingRequestsUrl() {
  return '/dashboard?section=messages&tab=requests';
}
