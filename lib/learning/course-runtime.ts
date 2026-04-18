export function calculateCoursePriceSummary(
  coursePrice: number,
  discountPercent: number | null | undefined
) {
  const normalizedDiscount =
    typeof discountPercent === 'number' && discountPercent > 0
      ? discountPercent
      : 0;

  const discountAmount = Number(
    ((coursePrice * normalizedDiscount) / 100).toFixed(2)
  );
  const finalPrice = Number(Math.max(0, coursePrice - discountAmount).toFixed(2));

  return {
    coursePrice: Number(coursePrice.toFixed(2)),
    discountAmount,
    finalPrice,
  };
}

export function calculateCourseOverallProgress(
  totalItems: number,
  completedItems: number
) {
  if (totalItems <= 0) {
    return 0;
  }

  return Math.round((completedItems / totalItems) * 100);
}

export function canReviewCourseEnrollment(status: string | null | undefined) {
  return status === 'ACTIVE' || status === 'COMPLETED';
}
