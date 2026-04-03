type SearchParamsLike = {
  get(name: string): string | null;
} | null | undefined;

type SessionLike = {
  id: string;
};

export function findSessionFromDashboardParams<T extends SessionLike>(
  searchParams: SearchParamsLike,
  sessions: readonly T[]
) {
  const sessionId = searchParams?.get('sessionId');

  if (!sessionId) {
    return null;
  }

  return sessions.find((session) => session.id === sessionId) ?? null;
}
