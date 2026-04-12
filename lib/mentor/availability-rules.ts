import { isWithinInterval } from 'date-fns';

type AvailabilityExceptionLike = {
  type: string;
  startDate: Date;
  endDate: Date;
};

export function isBlockingAvailabilityExceptionType(type: string) {
  return type === 'BLOCKED';
}

export function findBlockingAvailabilityException<T extends { type: string }>(
  exceptions: readonly T[]
) {
  return (
    exceptions.find((exception) =>
      isBlockingAvailabilityExceptionType(exception.type)
    ) ?? null
  );
}

export function hasBlockingAvailabilityException(
  exceptions: readonly AvailabilityExceptionLike[],
  targetDate: Date
) {
  return exceptions.some(
    (exception) =>
      isBlockingAvailabilityExceptionType(exception.type) &&
      isWithinInterval(targetDate, {
        start: exception.startDate,
        end: exception.endDate,
      })
  );
}
