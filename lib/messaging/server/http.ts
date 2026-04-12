import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { RateLimitError } from '@/lib/rate-limit';
import { isMessagingServiceError } from './errors';

export function toMessagingRouteErrorResponse(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  if (isMessagingServiceError(error)) {
    const payload =
      error.data && typeof error.data === 'object'
        ? { success: false, ...error.data, error: error.message }
        : { success: false, error: error.message };

    return NextResponse.json(payload, { status: error.status });
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { success: false, error: fallbackMessage },
    { status: 500 }
  );
}
