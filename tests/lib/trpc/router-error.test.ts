import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';

import { throwAsTRPCError } from '@/lib/trpc/router-error';

class CustomServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'CustomServiceError';
  }
}

describe('trpc router error adapter', () => {
  it('maps status-based service errors onto matching tRPC codes', () => {
    expect(() =>
      throwAsTRPCError(
        new CustomServiceError(403, 'Forbidden for this actor'),
        'fallback'
      )
    ).toThrowError(
      expect.objectContaining<Partial<TRPCError>>({
        code: 'FORBIDDEN',
        message: 'Forbidden for this actor',
      })
    );
  });

  it('uses the fallback message for unknown errors', () => {
    expect(() =>
      throwAsTRPCError(new Error('boom'), 'Unable to complete request')
    ).toThrowError(
      expect.objectContaining<Partial<TRPCError>>({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to complete request',
      })
    );
  });
});
