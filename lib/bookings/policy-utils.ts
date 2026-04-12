export function calculateRefundPercentage(
  isMentor: boolean,
  hoursUntilSession: number,
  policies: {
    freeCancellationHours: number;
    cancellationCutoffHours: number;
    partialRefundPercentage: number;
    lateCancellationRefundPercentage: number;
  }
) {
  if (isMentor) {
    return 100;
  }

  if (hoursUntilSession <= 0) {
    return 0;
  }

  if (hoursUntilSession >= policies.freeCancellationHours) {
    return 100;
  }

  if (hoursUntilSession >= policies.cancellationCutoffHours) {
    return policies.partialRefundPercentage;
  }

  return policies.lateCancellationRefundPercentage;
}
