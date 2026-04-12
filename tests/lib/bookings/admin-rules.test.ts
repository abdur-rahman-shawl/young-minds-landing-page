import { describe, expect, it } from 'vitest';

import {
  assertAdminAccess,
  assertAdminCanReassign,
  resolveAdminCancellation,
  resolveAdminClearNoShow,
  resolveAdminCompletion,
  resolveAdminRefund,
} from '@/lib/bookings/admin-rules';

describe('assertAdminAccess', () => {
  it('allows admin actors', () => {
    expect(() => assertAdminAccess(true)).not.toThrow();
  });

  it('rejects non-admin actors', () => {
    expect(() => assertAdminAccess(false)).toThrowError('Admin access required');
  });
});

describe('resolveAdminCancellation', () => {
  it('cancels mutable sessions and computes the refund amount', () => {
    const result = resolveAdminCancellation({
      status: 'scheduled',
      rate: 120,
      refundPercentage: 50,
      reason: 'Manual intervention',
    });

    expect(result.previousStatus).toBe('scheduled');
    expect(result.refundAmount).toBe(60);
    expect(result.update).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'admin',
      cancellationReason: 'Manual intervention',
      refundAmount: '60',
      refundPercentage: 50,
      refundStatus: 'pending',
    });
  });

  it('rejects cancelling completed sessions', () => {
    expect(() =>
      resolveAdminCancellation({
        status: 'completed',
        rate: 120,
        refundPercentage: 100,
        reason: 'Too late',
      })
    ).toThrowError('Cannot cancel a completed session');
  });
});

describe('resolveAdminCompletion', () => {
  it('marks sessions as completed and preserves overridden duration', () => {
    const result = resolveAdminCompletion({
      status: 'in_progress',
      originalDuration: 60,
      actualDuration: 75,
    });

    expect(result.previousStatus).toBe('in_progress');
    expect(result.duration).toBe(75);
    expect(result.update).toMatchObject({
      status: 'completed',
      duration: 75,
    });
  });

  it('rejects completing cancelled sessions', () => {
    expect(() =>
      resolveAdminCompletion({
        status: 'cancelled',
        originalDuration: 60,
      })
    ).toThrowError('Cannot complete a cancelled session');
  });
});

describe('resolveAdminRefund', () => {
  it('adds bonus refunds to the previous amount and caps the percentage', () => {
    const result = resolveAdminRefund({
      originalRate: 100,
      previousRefundAmount: 80,
      amount: 40,
      refundType: 'bonus',
    });

    expect(result.newRefundAmount).toBe(120);
    expect(result.refundPercentage).toBe(100);
    expect(result.update).toMatchObject({
      refundAmount: '120',
      refundPercentage: 100,
      refundStatus: 'pending',
    });
  });
});

describe('resolveAdminClearNoShow', () => {
  it('restores a no-show session to the requested status', () => {
    const result = resolveAdminClearNoShow({
      status: 'no_show',
      restoreStatus: 'completed',
    });

    expect(result.previousStatus).toBe('no_show');
    expect(result.update).toMatchObject({
      status: 'completed',
      noShowMarkedBy: null,
      noShowMarkedAt: null,
    });
  });

  it('rejects clearing sessions that are not no-show', () => {
    expect(() =>
      resolveAdminClearNoShow({
        status: 'scheduled',
        restoreStatus: 'completed',
      })
    ).toThrowError('Session is not marked as no-show');
  });
});

describe('assertAdminCanReassign', () => {
  it('allows reassignment to a different mentor for mutable sessions', () => {
    expect(() =>
      assertAdminCanReassign({
        status: 'scheduled',
        currentMentorId: 'mentor-1',
        newMentorId: 'mentor-2',
      })
    ).not.toThrow();
  });

  it('rejects reassignment to the same mentor', () => {
    expect(() =>
      assertAdminCanReassign({
        status: 'scheduled',
        currentMentorId: 'mentor-1',
        newMentorId: 'mentor-1',
      })
    ).toThrowError('Session is already assigned to this mentor');
  });
});
