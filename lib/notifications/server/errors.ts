export class NotificationServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'NotificationServiceError';
  }
}

export function assertNotification(
  condition: unknown,
  status: number,
  message: string,
  data?: unknown
): asserts condition {
  if (!condition) {
    throw new NotificationServiceError(status, message, data);
  }
}

export function isNotificationServiceError(
  error: unknown
): error is NotificationServiceError {
  return error instanceof NotificationServiceError;
}
