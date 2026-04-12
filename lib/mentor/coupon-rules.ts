export interface MentorCouponState {
  paymentStatus: string;
  couponCode: string | null;
  isCouponCodeEnabled: boolean;
}

export interface MentorCouponValidationResult {
  ok: boolean;
  message: string;
}

export function validateMentorCouponRedemption(
  mentor: MentorCouponState,
  inputCode: string
): MentorCouponValidationResult {
  if (mentor.paymentStatus === 'COMPLETED') {
    return {
      ok: false,
      message: 'Payment is already completed',
    };
  }

  if (!mentor.couponCode) {
    return {
      ok: false,
      message: 'No coupon code assigned to this account',
    };
  }

  if (!mentor.isCouponCodeEnabled) {
    return {
      ok: false,
      message: 'Coupon code is not active for this account',
    };
  }

  if (mentor.couponCode.toUpperCase() !== inputCode.trim().toUpperCase()) {
    return {
      ok: false,
      message: 'Invalid coupon code',
    };
  }

  return {
    ok: true,
    message: 'Coupon applied successfully',
  };
}
