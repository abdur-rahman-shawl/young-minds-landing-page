export class BookingServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'BookingServiceError';
  }
}

export function assertBooking(
  condition: unknown,
  status: number,
  message: string,
  data?: unknown
): asserts condition {
  if (!condition) {
    throw new BookingServiceError(status, message, data);
  }
}

export function isBookingServiceError(
  error: unknown
): error is BookingServiceError {
  return error instanceof BookingServiceError;
}
