import { assertBooking } from './server/errors';

type AdminManagedSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | string;

interface ResolveAdminCancellationInput {
  status: AdminManagedSessionStatus;
  rate: number;
  refundPercentage: number;
  reason: string;
}

interface ResolveAdminCompletionInput {
  status: AdminManagedSessionStatus;
  originalDuration: number | null;
  actualDuration?: number | null;
}

interface ResolveAdminRefundInput {
  originalRate: number;
  previousRefundAmount: number;
  amount: number;
  refundType: 'full' | 'partial' | 'bonus';
}

interface ResolveAdminClearNoShowInput {
  status: AdminManagedSessionStatus;
  restoreStatus: 'completed' | 'cancelled';
}

interface ResolveAdminReassignInput {
  status: AdminManagedSessionStatus;
  currentMentorId: string;
  newMentorId: string;
}

export function assertAdminAccess(isAdmin: boolean) {
  assertBooking(isAdmin, 403, 'Admin access required');
}

export function resolveAdminCancellation(input: ResolveAdminCancellationInput) {
  assertBooking(input.status !== 'cancelled', 400, 'Session is already cancelled');
  assertBooking(input.status !== 'completed', 400, 'Cannot cancel a completed session');

  const refundAmount = (input.rate * input.refundPercentage) / 100;

  return {
    previousStatus: input.status,
    refundAmount,
    update: {
      status: 'cancelled' as const,
      cancelledBy: 'admin',
      cancellationReason: input.reason,
      refundAmount: refundAmount.toString(),
      refundPercentage: input.refundPercentage,
      refundStatus: input.refundPercentage > 0 ? 'pending' : 'none',
      updatedAt: new Date(),
    },
  };
}

export function resolveAdminCompletion(input: ResolveAdminCompletionInput) {
  assertBooking(input.status !== 'completed', 400, 'Session is already completed');
  assertBooking(input.status !== 'cancelled', 400, 'Cannot complete a cancelled session');

  return {
    previousStatus: input.status,
    duration: input.actualDuration ?? input.originalDuration,
    update: {
      status: 'completed' as const,
      endedAt: new Date(),
      updatedAt: new Date(),
      ...(input.actualDuration !== undefined ? { duration: input.actualDuration } : {}),
    },
  };
}

export function resolveAdminRefund(input: ResolveAdminRefundInput) {
  const newRefundAmount =
    input.refundType === 'bonus'
      ? input.previousRefundAmount + input.amount
      : input.amount;
  const refundPercentage =
    input.originalRate > 0
      ? Math.round((newRefundAmount / input.originalRate) * 100)
      : 0;

  return {
    newRefundAmount,
    refundPercentage: Math.min(refundPercentage, 100),
    update: {
      refundAmount: newRefundAmount.toString(),
      refundPercentage: Math.min(refundPercentage, 100),
      refundStatus: 'pending',
      updatedAt: new Date(),
    },
  };
}

export function resolveAdminClearNoShow(input: ResolveAdminClearNoShowInput) {
  assertBooking(
    input.status === 'no_show',
    400,
    'Session is not marked as no-show'
  );

  return {
    previousStatus: input.status,
    update: {
      status: input.restoreStatus,
      noShowMarkedBy: null,
      noShowMarkedAt: null,
      updatedAt: new Date(),
    },
  };
}

export function assertAdminCanReassign(input: ResolveAdminReassignInput) {
  assertBooking(
    input.status !== 'completed',
    400,
    'Cannot reassign a completed session'
  );
  assertBooking(
    input.status !== 'cancelled',
    400,
    'Cannot reassign a cancelled session'
  );
  assertBooking(
    input.currentMentorId !== input.newMentorId,
    400,
    'Session is already assigned to this mentor'
  );
}
