import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterInputs, RouterOutputs } from '@/lib/trpc/types';

type EnrolledCoursesData = RouterOutputs['learning']['listCourses'];
type CourseEnrollmentStatusData = RouterOutputs['learning']['courseEnrollment'];
type CourseProgressData = RouterOutputs['learning']['courseProgress'];
type SavedItemsData = RouterOutputs['learning']['listSavedItems'];
type ReviewQuestionsData = RouterOutputs['learning']['reviewQuestions'];

type ListCoursesInput = RouterInputs['learning']['listCourses'];
type CourseEnrollmentStatusInput = RouterInputs['learning']['courseEnrollment'];
type EnrollCourseInput = RouterInputs['learning']['enrollCourse'];
type CourseProgressInput = RouterInputs['learning']['courseProgress'];
type UpdateCourseProgressInput = RouterInputs['learning']['updateCourseProgress'];
type RemoveSavedItemInput = RouterInputs['learning']['removeSavedItem'];
type SubmitCourseReviewInput = RouterInputs['learning']['submitCourseReview'];
type ToggleCourseReviewHelpfulInput =
  RouterInputs['learning']['toggleCourseReviewHelpful'];
type SubmitContentItemReviewInput =
  RouterInputs['learning']['submitContentItemReview'];
type ReviewQuestionsInput = RouterInputs['learning']['reviewQuestions'];
type SubmitReviewInput = RouterInputs['learning']['submitReview'];

export const learningKeys = {
  all: ['learning'] as const,
  courses: (input?: ListCoursesInput) =>
    ['learning', 'courses', input ?? {}] as const,
  courseEnrollment: (input: CourseEnrollmentStatusInput) =>
    ['learning', 'course-enrollment', input] as const,
  courseProgress: (input: CourseProgressInput) =>
    ['learning', 'course-progress', input] as const,
  savedItems: ['learning', 'saved-items'] as const,
  reviewQuestions: (input: ReviewQuestionsInput) =>
    ['learning', 'review-questions', input] as const,
};

async function invalidateLearningQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: learningKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    queryClient.invalidateQueries({ queryKey: ['analytics'] }),
  ]);
}

export function useEnrolledCoursesQuery(
  input?: ListCoursesInput,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: learningKeys.courses(input),
    queryFn: (): Promise<EnrolledCoursesData> =>
      trpcClient.learning.listCourses.query(input),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCourseEnrollmentStatusQuery(
  input: CourseEnrollmentStatusInput,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: learningKeys.courseEnrollment(input),
    queryFn: (): Promise<CourseEnrollmentStatusData> =>
      trpcClient.learning.courseEnrollment.query(input),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useEnrollCourseMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EnrollCourseInput) =>
      trpcClient.learning.enrollCourse.mutate(input),
    onSuccess: async (_data, input) => {
      await Promise.all([
        invalidateLearningQueries(queryClient),
        queryClient.invalidateQueries({
          queryKey: learningKeys.courseEnrollment({ courseId: input.courseId }),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to enroll in course'
      );
    },
  });
}

export function useCourseProgressQuery(
  input: CourseProgressInput,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: learningKeys.courseProgress(input),
    queryFn: (): Promise<CourseProgressData> =>
      trpcClient.learning.courseProgress.query(input),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUpdateCourseProgressMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCourseProgressInput) =>
      trpcClient.learning.updateCourseProgress.mutate(input),
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: learningKeys.courses(),
        }),
        queryClient.invalidateQueries({
          queryKey: ['analytics'],
        }),
        queryClient.invalidateQueries({
          queryKey: learningKeys.courseProgress({ courseId: input.courseId }),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update progress'
      );
    },
  });
}

export function useSavedItemsQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: learningKeys.savedItems,
    queryFn: (): Promise<SavedItemsData> =>
      trpcClient.learning.listSavedItems.query(),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSubmitCourseReviewMutation() {
  const trpcClient = useTRPCClient();

  return useMutation({
    mutationFn: (input: SubmitCourseReviewInput) =>
      trpcClient.learning.submitCourseReview.mutate(input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit review'
      );
    },
  });
}

export function useToggleCourseReviewHelpfulMutation() {
  const trpcClient = useTRPCClient();

  return useMutation({
    mutationFn: (input: ToggleCourseReviewHelpfulInput) =>
      trpcClient.learning.toggleCourseReviewHelpful.mutate(input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update helpful vote'
      );
    },
  });
}

export function useSubmitContentItemReviewMutation() {
  const trpcClient = useTRPCClient();

  return useMutation({
    mutationFn: (input: SubmitContentItemReviewInput) =>
      trpcClient.learning.submitContentItemReview.mutate(input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit lesson review'
      );
    },
  });
}

export function useRemoveSavedItemMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveSavedItemInput) =>
      trpcClient.learning.removeSavedItem.mutate(input),
    onSuccess: async () => {
      await invalidateLearningQueries(queryClient);
      toast.success('Removed from saved items');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove saved item'
      );
    },
  });
}

export function useReviewQuestionsQuery(
  input: ReviewQuestionsInput,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: learningKeys.reviewQuestions(input),
    queryFn: (): Promise<ReviewQuestionsData> =>
      trpcClient.learning.reviewQuestions.query(input),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSubmitSessionReviewMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitReviewInput) =>
      trpcClient.learning.submitReview.mutate(input),
    onSuccess: async () => {
      await invalidateLearningQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit feedback'
      );
    },
  });
}
