import { describe, expect, it, vi } from 'vitest';

import {
  buildMentorAdminUpdatePlan,
  generateAdminMentorCouponCode,
} from '@/lib/admin/mentor-actions';

describe('buildMentorAdminUpdatePlan', () => {
  it('enables and generates a coupon when approving a mentor with coupon access', () => {
    const generateCouponCode = vi.fn(() => 'ABC123');

    const result = buildMentorAdminUpdatePlan(
      {
        existingStatus: 'IN_PROGRESS',
        existingVerificationNotes: null,
        existingCouponCode: null,
        existingCouponEnabled: false,
        existingIsExpert: false,
        nextStatus: 'VERIFIED',
        enableCoupon: true,
      },
      {
        now: new Date('2026-04-03T00:00:00.000Z'),
        generateCouponCode,
      }
    );

    expect(result.isStatusChanged).toBe(true);
    expect(result.shouldEnableCoupon).toBe(true);
    expect(result.couponCode).toBe('ABC123');
    expect(result.updateData.isCouponCodeEnabled).toBe(true);
    expect(result.updateData.couponCode).toBe('ABC123');
    expect(generateCouponCode).toHaveBeenCalledTimes(1);
  });

  it('disables coupon access automatically when a mentor is not verified', () => {
    const result = buildMentorAdminUpdatePlan({
      existingStatus: 'VERIFIED',
      existingVerificationNotes: 'Prior note',
      existingCouponCode: 'EXIST1',
      existingCouponEnabled: true,
      existingIsExpert: false,
      nextStatus: 'REJECTED',
      notes: '',
    });

    expect(result.shouldEnableCoupon).toBe(false);
    expect(result.couponCode).toBeNull();
    expect(result.noteToStore).toBeNull();
    expect(result.updateData.isCouponCodeEnabled).toBe(false);
    expect(result.updateData.couponCode).toBeNull();
  });

  it('tracks expert flag changes independently from status changes', () => {
    const result = buildMentorAdminUpdatePlan({
      existingStatus: 'VERIFIED',
      existingVerificationNotes: 'Looks good',
      existingCouponCode: 'KEEP12',
      existingCouponEnabled: true,
      existingIsExpert: false,
      nextStatus: 'VERIFIED',
      isExpert: true,
    });

    expect(result.isStatusChanged).toBe(false);
    expect(result.expertChanged).toBe(true);
    expect(result.previousIsExpert).toBe(false);
    expect(result.updateData.isExpert).toBe(true);
    expect(result.updateData.couponCode).toBe('KEEP12');
  });
});

describe('generateAdminMentorCouponCode', () => {
  it('uses the expected coupon alphabet and length', () => {
    const code = generateAdminMentorCouponCode(12);
    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });
});
