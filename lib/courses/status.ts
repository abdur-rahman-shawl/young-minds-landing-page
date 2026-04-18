export const PUBLIC_COURSE_STATUS = 'APPROVED' as const;

export function canViewCourseDetail(input: {
  status: string | null | undefined;
  isEnrolled: boolean;
  isOwner: boolean;
}) {
  return (
    input.status === PUBLIC_COURSE_STATUS || input.isEnrolled || input.isOwner
  );
}

export function canEnrollInCourse(status: string | null | undefined) {
  return status === PUBLIC_COURSE_STATUS;
}
