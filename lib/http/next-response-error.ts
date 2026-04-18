import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  getErrorContract,
  isStatusDataErrorLike,
} from '@/lib/http/error-metadata';
import { RateLimitError } from '@/lib/rate-limit';

export function nextErrorResponse(
  error: unknown,
  fallbackMessage: string
) {
  const contract = getErrorContract(error);

  if (isStatusDataErrorLike(error)) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        ...(contract.data ? { data: contract.data } : {}),
      },
      { status: contract.status ?? 500 }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 429 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: error.errors[0]?.message ?? 'Invalid request',
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: fallbackMessage,
    },
    { status: 500 }
  );
}
