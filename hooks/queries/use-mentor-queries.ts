import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/react-query';

interface MentorFilters {
  industry?: string;
  expertise?: string;
  experience?: number;
  availability?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface MentorProfile {
  id: string;
  verificationStatus: string;
  verificationNotes?: string;
  fullName?: string;
  title?: string;
  company?: string;
  industry?: string;
  expertise?: string;
  experience?: number;
  about?: string;
  profileImageUrl?: string;
  hourlyRate?: string;
  currency?: string;
  availability?: string;
  headline?: string;
  maxMentees?: number;
}

// Get list of mentors with filters and pagination
export function useMentorsQuery(filters: MentorFilters = {}) {
  return useQuery({
    queryKey: queryKeys.mentorsList(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const response = await fetch(`/api/mentors?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch mentors: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Infinite query for mentor list with pagination
export function useMentorsInfiniteQuery(filters: MentorFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['mentors', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams();

      Object.entries({ ...filters, page: pageParam }).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const response = await fetch(`/api/mentors?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch mentors: ${response.status}`);
      }

      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      // Assuming the API returns hasMore and nextPage
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Get specific mentor details
export function useMentorQuery(mentorId: string) {
  return useQuery({
    queryKey: queryKeys.mentorDetail(mentorId),
    queryFn: async () => {
      const response = await fetch(`/api/mentors/${mentorId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch mentor: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!mentorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get mentor profile for current user
export function useMentorProfileQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.mentorProfile(userId),
    queryFn: async () => {
      const response = await fetch(`/api/user/profile?userId=${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch mentor profile: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data.mentorProfile : null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Update mentor profile mutation
export function useUpdateMentorProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, profileData }: { userId: string; profileData: Partial<MentorProfile> }) => {
      const response = await fetch('/api/mentors/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, profileData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update mentor profile: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch mentor-related queries
      invalidateQueries.mentorProfile(variables.userId);

      // Update the specific mentor profile cache
      queryClient.setQueryData(
        queryKeys.mentorProfile(variables.userId),
        data.data
      );

      // Invalidate mentor lists to show updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.mentors });
    },
    onError: (error) => {
      console.error('Failed to update mentor profile:', error);
    },
  });
}

// Apply to become mentor mutation
export function useApplyMentorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await fetch('/api/mentors/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit mentor application: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate session to refresh roles
      invalidateQueries.session();

      // Invalidate user profile to show new mentor status
      if (variables.userId) {
        invalidateQueries.userProfile(variables.userId);
      }
    },
  });
}

// Save/unsave mentor mutation
export function useSaveMentorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mentorId, action }: { mentorId: string; action: 'save' | 'unsave' }) => {
      const response = await fetch('/api/saved-mentors', {
        method: action === 'save' ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mentorId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} mentor: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate saved mentors list
      queryClient.invalidateQueries({
        queryKey: queryKeys.savedMentors(data.userId)
      });

      // Update the specific mentor's saved status if it's in cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.mentorDetail(variables.mentorId)
      });
    },
  });
}