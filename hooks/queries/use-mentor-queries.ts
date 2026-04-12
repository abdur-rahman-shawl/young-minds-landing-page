import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/lib/react-query';
import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterInputs, RouterOutputs } from '@/lib/trpc/types';

interface MentorFilters {
  industry?: string;
  expertise?: string;
  experience?: number;
  availability?: string;
  search?: string;
  page?: number;
  limit?: number;
  expertOnly?: boolean;
}

type MentorListInput = RouterInputs['mentor']['list'];
type MentorDetailInput = RouterInputs['mentor']['get'];
type MentorApplication = RouterOutputs['mentor']['application'];
type MentorProfileUpdateInput = RouterInputs['mentor']['updateProfile'];
type MentorCouponInput = RouterInputs['mentor']['validateCoupon'];
type MentorAvailabilityQueryInput = RouterInputs['mentor']['availability'];
type MentorAvailabilityScheduleInput =
  RouterInputs['mentor']['upsertAvailability']['schedule'];
type MentorAvailabilityExceptionInput =
  RouterInputs['mentor']['createAvailabilityException'];
type MentorAvailabilityExceptionDeleteInput =
  RouterInputs['mentor']['deleteAvailabilityExceptions'];
type MentorSlotsInput = RouterInputs['mentor']['availableSlots'];
type SavedMentorInput = RouterInputs['mentor']['save'];
type CourseCommentReplyInput = RouterInputs['mentor']['replyToCourseComment'];

export const mentorKeys = {
  application: ['mentor', 'application'] as const,
  directory: (filters?: MentorListInput) =>
    ['mentor', 'directory', filters ?? {}] as const,
  detail: (mentorId: string) => ['mentor', 'detail', mentorId] as const,
  saved: ['mentor', 'saved'] as const,
  reviews: ['mentor', 'reviews'] as const,
  courseComments: ['mentor', 'course-comments'] as const,
  availability: (mentorUserId: string, range?: { startDate?: string; endDate?: string }) =>
    ['mentor', 'availability', mentorUserId, range ?? {}] as const,
  availabilityExceptions: (
    mentorUserId: string,
    range?: { startDate?: string; endDate?: string }
  ) => ['mentor', 'availability-exceptions', mentorUserId, range ?? {}] as const,
  slots: (input: MentorSlotsInput) => ['mentor', 'slots', input] as const,
  eligibility: (mentorUserId: string) =>
    ['mentor', 'booking-eligibility', mentorUserId] as const,
};

async function invalidateMentorLifecycleQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mentorKeys.application }),
    queryClient.invalidateQueries({ queryKey: ['mentor'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionWithRoles }),
    queryClient.invalidateQueries({ queryKey: queryKeys.mentors }),
  ]);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response
    .json()
    .catch(() => ({ success: false, error: 'Invalid response from server' }));

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return (data.data ?? data) as T;
}

export function useMentorsQuery(filters: MentorFilters = {}) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: queryKeys.mentorsList(filters),
    queryFn: () => trpcClient.mentor.list.query(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useMentorsInfiniteQuery(filters: MentorFilters = {}) {
  const trpcClient = useTRPCClient();

  return useInfiniteQuery({
    queryKey: ['mentors', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) =>
      trpcClient.mentor.list.query({
        ...filters,
        page: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore
        ? (lastPage.pagination.page ?? 1) + 1
        : undefined,
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useMentorQuery(mentorId: string) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: queryKeys.mentorDetail(mentorId),
    queryFn: () =>
      trpcClient.mentor.get.query({
        mentorId,
      } as MentorDetailInput),
    enabled: !!mentorId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useMentorProfileQuery(userId: string) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: queryKeys.mentorProfile(userId),
    queryFn: (): Promise<MentorApplication> => trpcClient.mentor.application.query(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useMentorApplicationQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.application,
    queryFn: (): Promise<MentorApplication> =>
      trpcClient.mentor.application.query(),
    enabled,
    retry: false,
  });
}

export function useUpdateMentorProfileMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: MentorProfileUpdateInput) =>
      trpcClient.mentor.updateProfile.mutate(profileData),
    onSuccess: async () => {
      await invalidateMentorLifecycleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update mentor profile'
      );
    },
  });
}

export function useSubmitMentorApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/mentors/apply', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      return parseJsonResponse<{
        id: string;
        userId: string;
        status: 'IN_PROGRESS' | 'RESUBMITTED';
      }>(response);
    },
    onSuccess: async () => {
      await invalidateMentorLifecycleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit mentor application'
      );
    },
  });
}

export const useApplyMentorMutation = useSubmitMentorApplicationMutation;

export function useUploadMentorProfileFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/mentors/update-profile', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      return parseJsonResponse<Record<string, unknown>>(response);
    },
    onSuccess: async () => {
      await invalidateMentorLifecycleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update mentor profile'
      );
    },
  });
}

export function useValidateMentorCouponMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MentorCouponInput) =>
      trpcClient.mentor.validateCoupon.mutate(input),
    onSuccess: async () => {
      await invalidateMentorLifecycleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to validate coupon code'
      );
    },
  });
}

export function useSavedMentorsQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.saved,
    queryFn: () => trpcClient.mentor.listSaved.query(),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSaveMentorMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mentorId,
      action,
    }: {
      mentorId: string;
      action: 'save' | 'unsave';
    }) => {
      if (action === 'save') {
        return trpcClient.mentor.save.mutate({ mentorId } as SavedMentorInput);
      }

      return trpcClient.mentor.unsave.mutate({ mentorId } as SavedMentorInput);
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mentorKeys.saved }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.mentorDetail(variables.mentorId),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update saved mentor'
      );
    },
  });
}

export function useMentorReviewsQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.reviews,
    queryFn: () => trpcClient.mentor.reviews.query(),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useMentorCourseCommentsQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.courseComments,
    queryFn: () => trpcClient.mentor.courseComments.query(),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useReplyMentorCourseCommentMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CourseCommentReplyInput) =>
      trpcClient.mentor.replyToCourseComment.mutate(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mentorKeys.courseComments });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save reply');
    },
  });
}

export function useMentorAvailabilityQuery(
  mentorUserId: string | undefined,
  options: { startDate?: string; endDate?: string; enabled?: boolean } = {}
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.availability(mentorUserId ?? 'unknown', {
      startDate: options.startDate,
      endDate: options.endDate,
    }),
    queryFn: () =>
      trpcClient.mentor.availability.query({
        mentorUserId: mentorUserId!,
        startDate: options.startDate,
        endDate: options.endDate,
      } as MentorAvailabilityQueryInput),
    enabled: !!mentorUserId && (options.enabled ?? true),
  });
}

export function useUpsertMentorAvailabilityMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      mentorUserId: string;
      schedule: MentorAvailabilityScheduleInput;
    }) => trpcClient.mentor.upsertAvailability.mutate(input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: mentorKeys.availability(variables.mentorUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: mentorKeys.availabilityExceptions(variables.mentorUserId),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save availability');
    },
  });
}

export function useMentorAvailabilityExceptionsQuery(
  mentorUserId: string | undefined,
  options: { startDate?: string; endDate?: string; enabled?: boolean } = {}
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.availabilityExceptions(mentorUserId ?? 'unknown', {
      startDate: options.startDate,
      endDate: options.endDate,
    }),
    queryFn: () =>
      trpcClient.mentor.availabilityExceptions.query({
        mentorUserId: mentorUserId!,
        startDate: options.startDate,
        endDate: options.endDate,
      } as MentorAvailabilityQueryInput),
    enabled: !!mentorUserId && (options.enabled ?? true),
  });
}

export function useCreateMentorAvailabilityExceptionMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MentorAvailabilityExceptionInput) =>
      trpcClient.mentor.createAvailabilityException.mutate(input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: mentorKeys.availabilityExceptions(variables.mentorUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: mentorKeys.availability(variables.mentorUserId),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create exception'
      );
    },
  });
}

export function useDeleteMentorAvailabilityExceptionsMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MentorAvailabilityExceptionDeleteInput) =>
      trpcClient.mentor.deleteAvailabilityExceptions.mutate(input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: mentorKeys.availabilityExceptions(variables.mentorUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: mentorKeys.availability(variables.mentorUserId),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete exception'
      );
    },
  });
}

export function useMentorAvailableSlotsQuery(
  input: MentorSlotsInput | undefined,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: input ? mentorKeys.slots(input) : ['mentor', 'slots', 'disabled'],
    queryFn: () => trpcClient.mentor.availableSlots.query(input!),
    enabled: !!input && enabled,
  });
}

export function useMentorBookingEligibilityQuery(
  mentorUserId: string | undefined,
  enabled = true
) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: mentorKeys.eligibility(mentorUserId ?? 'unknown'),
    queryFn: () =>
      trpcClient.mentor.bookingEligibility.query({
        mentorUserId: mentorUserId!,
      }),
    enabled: !!mentorUserId && enabled,
  });
}
