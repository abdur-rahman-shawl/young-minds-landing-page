import { describe, expect, it } from 'vitest';

import { validateMentorCouponRedemption } from '@/lib/mentor/coupon-rules';

describe('validateMentorCouponRedemption', () => {
  it('rejects coupon redemption when coupon access is disabled', () => {
    expect(
      validateMentorCouponRedemption(
        {
          paymentStatus: 'PENDING',
          couponCode: 'MENTOR42',
          isCouponCodeEnabled: false,
        },
        'MENTOR42'
      )
    ).toEqual({
      ok: false,
      message: 'Coupon code is not active for this account',
    });
  });

  it('accepts a valid coupon code regardless of input casing', () => {
    expect(
      validateMentorCouponRedemption(
        {
          paymentStatus: 'PENDING',
          couponCode: 'MENTOR42',
          isCouponCodeEnabled: true,
        },
        'mentor42'
      )
    ).toEqual({
      ok: true,
      message: 'Coupon applied successfully',
    });
  });
});
