import { describe, expect, it } from 'vitest';

import {
  PUBLIC_COURSE_STATUS,
  canEnrollInCourse,
  canViewCourseDetail,
} from '@/lib/courses/status';

describe('course status helpers', () => {
  it('treats approved content as the single public course status', () => {
    expect(PUBLIC_COURSE_STATUS).toBe('APPROVED');
    expect(canEnrollInCourse('APPROVED')).toBe(true);
    expect(canEnrollInCourse('PUBLISHED')).toBe(false);
  });

  it('allows non-public course detail access only for enrolled users or owners', () => {
    expect(
      canViewCourseDetail({
        status: 'APPROVED',
        isEnrolled: false,
        isOwner: false,
      })
    ).toBe(true);

    expect(
      canViewCourseDetail({
        status: 'DRAFT',
        isEnrolled: true,
        isOwner: false,
      })
    ).toBe(true);

    expect(
      canViewCourseDetail({
        status: 'DRAFT',
        isEnrolled: false,
        isOwner: true,
      })
    ).toBe(true);

    expect(
      canViewCourseDetail({
        status: 'DRAFT',
        isEnrolled: false,
        isOwner: false,
      })
    ).toBe(false);
  });
});
