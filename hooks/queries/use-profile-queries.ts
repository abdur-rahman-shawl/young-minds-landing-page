import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/lib/react-query';
import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterInputs, RouterOutputs } from '@/lib/trpc/types';

type UserProfileData = RouterOutputs['profile']['me'];
type UpsertMenteeProfileInput = RouterInputs['profile']['upsertMenteeProfile'];

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export function useUserProfileQuery(enabled = true) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: profileKeys.me,
    queryFn: (): Promise<UserProfileData> => trpcClient.profile.me.query(),
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUpsertMenteeProfileMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertMenteeProfileInput) =>
      trpcClient.profile.upsertMenteeProfile.mutate(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionWithRoles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.menteeProfile('current') }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    },
  });
}
