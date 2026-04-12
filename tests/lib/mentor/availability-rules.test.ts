import { describe, expect, it } from 'vitest';

import {
  findBlockingAvailabilityException,
  hasBlockingAvailabilityException,
  isBlockingAvailabilityExceptionType,
} from '@/lib/mentor/availability-rules';

describe('availability rules', () => {
  it('treats BLOCKED exceptions as booking blockers', () => {
    expect(isBlockingAvailabilityExceptionType('BLOCKED')).toBe(true);
  });

  it('does not treat legacy or non-blocking types as blockers', () => {
    expect(isBlockingAvailabilityExceptionType('UNAVAILABLE')).toBe(false);
    expect(isBlockingAvailabilityExceptionType('AVAILABLE')).toBe(false);
    expect(isBlockingAvailabilityExceptionType('BREAK')).toBe(false);
    expect(isBlockingAvailabilityExceptionType('BUFFER')).toBe(false);
  });

  it('finds blocking exceptions from a pre-filtered exception list', () => {
    expect(
      findBlockingAvailabilityException([
        { type: 'AVAILABLE' },
        { type: 'BLOCKED' },
      ])
    ).toEqual({ type: 'BLOCKED' });
  });

  it('detects blocking exceptions that cover the target date', () => {
    const exceptions = [
      {
        type: 'BLOCKED',
        startDate: new Date('2026-04-03T09:00:00.000Z'),
        endDate: new Date('2026-04-03T17:00:00.000Z'),
      },
      {
        type: 'BREAK',
        startDate: new Date('2026-04-03T12:00:00.000Z'),
        endDate: new Date('2026-04-03T13:00:00.000Z'),
      },
    ];

    expect(
      hasBlockingAvailabilityException(
        exceptions,
        new Date('2026-04-03T10:00:00.000Z')
      )
    ).toBe(true);
  });

  it('ignores non-blocking exceptions for availability checks', () => {
    const exceptions = [
      {
        type: 'BREAK',
        startDate: new Date('2026-04-03T12:00:00.000Z'),
        endDate: new Date('2026-04-03T13:00:00.000Z'),
      },
    ];

    expect(
      hasBlockingAvailabilityException(
        exceptions,
        new Date('2026-04-03T12:30:00.000Z')
      )
    ).toBe(false);
  });
});
