export class MentorLifecycleServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'MentorLifecycleServiceError';
  }
}

export function assertMentorLifecycle(
  condition: unknown,
  status: number,
  message: string,
  data?: unknown
): asserts condition {
  if (!condition) {
    throw new MentorLifecycleServiceError(status, message, data);
  }
}
