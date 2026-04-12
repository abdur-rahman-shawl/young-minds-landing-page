import { describe, expect, it } from 'vitest';

import { calculateRefundPercentage } from '@/lib/bookings/policy-utils';

const defaultPolicies = {
  freeCancellationHours: 24,
  cancellationCutoffHours: 2,
  partialRefundPercentage: 70,
  lateCancellationRefundPercentage: 0,
};

describe('calculateRefundPercentage', () => {
  it('returns full refund when mentor cancels', () => {
    expect(calculateRefundPercentage(true, 1, defaultPolicies)).toBe(100);
  });

  it('returns zero after the session time has passed', () => {
    expect(calculateRefundPercentage(false, 0, defaultPolicies)).toBe(0);
    expect(calculateRefundPercentage(false, -3, defaultPolicies)).toBe(0);
  });

  it('returns full refund inside the free-cancellation window', () => {
    expect(calculateRefundPercentage(false, 30, defaultPolicies)).toBe(100);
  });

  it('returns partial refund between free and cutoff windows', () => {
    expect(calculateRefundPercentage(false, 6, defaultPolicies)).toBe(70);
  });

  it('returns late refund after the cutoff window', () => {
    expect(calculateRefundPercentage(false, 1, defaultPolicies)).toBe(0);
  });
});
