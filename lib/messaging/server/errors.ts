export class MessagingServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'MessagingServiceError';
  }
}

export function assertMessaging(
  condition: unknown,
  status: number,
  message: string,
  data?: unknown
): asserts condition {
  if (!condition) {
    throw new MessagingServiceError(status, message, data);
  }
}

export function isMessagingServiceError(
  error: unknown
): error is MessagingServiceError {
  return error instanceof MessagingServiceError;
}
