import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterInputs, RouterOutputs } from '@/lib/trpc/types';

type AdminContentListResponse = RouterOutputs['content']['adminList'];
export type AdminContentItem = AdminContentListResponse['data'][number];
export type AdminContentPagination = AdminContentListResponse['pagination'];
export type AdminContentAction = RouterInputs['content']['adminReview']['action'];

export const adminContentKeys = {
  all: ['admin-content'] as const,
  list: (input: {
    status?: string;
    page?: number;
    search?: string;
    type?: string;
  }) => ['admin-content', 'list', input] as const,
};

export function useAdminContentListQuery(input: {
  status?: string;
  page?: number;
  search?: string;
  type?: string;
}) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: adminContentKeys.list(input),
    queryFn: () =>
      trpcClient.content.adminList.query({
        status: input.status,
        page: input.page ?? 1,
        search: input.search,
        type:
          input.type && input.type !== 'ALL'
            ? (input.type as 'COURSE' | 'FILE' | 'URL')
            : 'ALL',
        limit: 20,
      }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminContentReviewMutation() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      contentId: string;
      action: AdminContentAction;
      note?: string;
    }) => trpcClient.content.adminReview.mutate(input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminContentKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['content'] }),
      ]);
      toast.success(`Action '${variables.action}' completed successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to review content'
      );
    },
  });
}
