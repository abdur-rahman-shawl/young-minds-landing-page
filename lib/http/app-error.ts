export class AppHttpError extends Error {
  public readonly status: number;
  public readonly data?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppHttpError';
    this.status = status;
    this.data = data;
  }
}

export function isAppHttpError(error: unknown): error is AppHttpError {
  return error instanceof AppHttpError;
}
