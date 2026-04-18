import type { VerificationStatus } from '@/lib/db/schema/mentors';
import { resolveMentorVerificationTransition } from '@/lib/mentor/verification-state-machine';

const COUPON_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface BuildMentorAdminUpdatePlanInput {
  existingStatus: VerificationStatus;
  existingVerificationNotes: string | null;
  existingCouponCode: string | null;
  existingCouponEnabled: boolean;
  existingIsExpert: boolean;
  nextStatus: VerificationStatus;
  notes?: string;
  enableCoupon?: boolean;
  isExpert?: boolean;
}

export function generateAdminMentorCouponCode(length = 6) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * COUPON_CHARSET.length);
    code += COUPON_CHARSET[randomIndex];
  }
  return code;
}

export function buildMentorAdminUpdatePlan(
  input: BuildMentorAdminUpdatePlanInput,
  options?: {
    now?: Date;
    generateCouponCode?: () => string;
  }
) {
  const noteToStore =
    input.notes === undefined
      ? input.existingVerificationNotes
      : input.notes.length > 0
        ? input.notes
        : null;

  const shouldEnableCoupon =
    input.nextStatus === 'VERIFIED'
      ? input.enableCoupon === undefined
        ? input.existingCouponEnabled
        : input.enableCoupon
      : false;

  const couponCode = shouldEnableCoupon
    ? input.existingCouponCode ??
      (options?.generateCouponCode ?? generateAdminMentorCouponCode)()
    : null;

  const previousIsExpert = Boolean(input.existingIsExpert);
  const expertChanged =
    input.isExpert !== undefined && input.isExpert !== previousIsExpert;
  const nextStatus =
    input.existingStatus === input.nextStatus
      ? input.existingStatus
      : input.nextStatus === 'VERIFIED'
        ? resolveMentorVerificationTransition(
            input.existingStatus,
            'admin_verified'
          )
        : input.nextStatus === 'REJECTED'
          ? resolveMentorVerificationTransition(
              input.existingStatus,
              'admin_rejected'
            )
          : resolveMentorVerificationTransition(
              input.existingStatus,
              'admin_reverification_requested'
            );

  return {
    isStatusChanged: input.existingStatus !== nextStatus,
    previousIsExpert,
    expertChanged,
    noteToStore,
    shouldEnableCoupon,
    couponCode,
    updateData: {
      verificationStatus: nextStatus,
      verificationNotes: noteToStore,
      updatedAt: options?.now ?? new Date(),
      isCouponCodeEnabled: shouldEnableCoupon,
      couponCode,
      ...(input.isExpert !== undefined ? { isExpert: input.isExpert } : {}),
    },
  };
}
