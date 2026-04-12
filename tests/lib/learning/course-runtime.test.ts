import { describe, expect, it } from 'vitest';

import {
  calculateCourseOverallProgress,
  calculateCoursePriceSummary,
  canReviewCourseEnrollment,
} from '@/lib/learning/course-runtime';

describe('course runtime helpers', () => {
  it('calculates discounted pricing deterministically', () => {
    expect(calculateCoursePriceSummary(120, 25)).toEqual({
      coursePrice: 120,
      discountAmount: 30,
      finalPrice: 90,
    });
  });

  it('guards against invalid completion math', () => {
    expect(calculateCourseOverallProgress(0, 0)).toBe(0);
    expect(calculateCourseOverallProgress(8, 3)).toBe(38);
  });

  it('allows reviews only for active or completed enrollments', () => {
    expect(canReviewCourseEnrollment('ACTIVE')).toBe(true);
    expect(canReviewCourseEnrollment('COMPLETED')).toBe(true);
    expect(canReviewCourseEnrollment('PAUSED')).toBe(false);
  });
});
