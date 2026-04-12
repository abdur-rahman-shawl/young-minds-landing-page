import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useTRPCClient } from '@/lib/trpc/react';
import type { RouterInputs } from '@/lib/trpc/types';

export interface MentorContent {
  id: string;
  title: string;
  description?: string | null;
  type: 'COURSE' | 'FILE' | 'URL';
  status:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'ARCHIVED'
    | 'FLAGGED';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  url?: string | null;
  urlTitle?: string | null;
  urlDescription?: string | null;
  submittedForReviewAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  statusBeforeArchive?: string | null;
  requireReviewAfterRestore?: boolean | null;
  deletedAt?: string | Date | null;
  deleteReason?: string | null;
  purgeAfterAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Course {
  id: string;
  contentId: string;
  ownerType?: 'MENTOR' | 'PLATFORM';
  ownerId?: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration?: number | null;
  price?: string | null;
  currency: string;
  thumbnailUrl?: string | null;
  category?: string | null;
  tags?: string[];
  platformTags?: string[];
  platformName?: string | null;
  prerequisites?: string[];
  learningOutcomes?: string[];
  enrollmentCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  learningObjectives?: string[] | null;
  estimatedDurationMinutes?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CourseSection {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  contentItems?: ContentItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ContentItem {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  type: 'VIDEO' | 'PDF' | 'DOCUMENT' | 'URL' | 'TEXT';
  orderIndex: number;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  duration?: number | null;
  isPreview: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProfileContentItem extends MentorContent {
  displayOrder?: number;
  addedAt?: string | Date;
}

type ContentList = MentorContent[];
type ContentDetail = MentorContent & {
  course?: Course & {
    modules: (CourseModule & { sections: (CourseSection & { contentItems: ContentItem[] })[] })[];
  };
};

type CreateContentInput = RouterInputs['content']['create'];
type UpdateContentInput = RouterInputs['content']['update'];
type SaveCourseInput = RouterInputs['content']['saveCourse'];
type CreateModuleInput = RouterInputs['content']['createModule'];
type UpdateModuleInput = RouterInputs['content']['updateModule'];
type DeleteModuleInput = RouterInputs['content']['deleteModule'];
type CreateSectionInput = RouterInputs['content']['createSection'];
type UpdateSectionInput = RouterInputs['content']['updateSection'];
type DeleteSectionInput = RouterInputs['content']['deleteSection'];
type CreateContentItemInput = RouterInputs['content']['createContentItem'];
type UpdateContentItemInput = RouterInputs['content']['updateContentItem'];
type DeleteContentItemInput = RouterInputs['content']['deleteContentItem'];

export const contentKeys = {
  all: ['content'] as const,
  list: ['content', 'list'] as const,
  detail: (contentId: string) => ['content', 'detail', contentId] as const,
  profile: ['content', 'profile'] as const,
};

async function invalidateContentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  contentId?: string
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: contentKeys.all }),
    contentId
      ? queryClient.invalidateQueries({
          queryKey: contentKeys.detail(contentId),
        })
      : Promise.resolve(),
  ]);
}

export function useContentList() {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: contentKeys.list,
    queryFn: async (): Promise<ContentList> => trpcClient.content.list.query(),
  });
}

export function useContent(contentId: string) {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: contentKeys.detail(contentId),
    queryFn: async (): Promise<ContentDetail> =>
      trpcClient.content.get.query({ contentId }),
    enabled: !!contentId,
  });
}

export function useCreateContent() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContentInput): Promise<MentorContent> =>
      trpcClient.content.create.mutate(data),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Content created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContent() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateContentInput['data'];
    }): Promise<MentorContent> =>
      trpcClient.content.update.mutate({
        contentId: id,
        data,
      }),
    onSuccess: async (_result, variables) => {
      await invalidateContentQueries(queryClient, variables.id);
      toast.success('Content updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteContent() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string
    ): Promise<{ message: string; purgeAfterAt: string | null }> =>
      trpcClient.content.delete.mutate({ contentId: id }),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Content deleted. It will be retained for 30 days.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSaveCourse() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      data,
    }: {
      contentId: string;
      data: SaveCourseInput['data'];
      hasExisting?: boolean;
    }): Promise<Course> =>
      trpcClient.content.saveCourse.mutate({
        contentId,
        data,
      }),
    onSuccess: async (_result, variables) => {
      await invalidateContentQueries(queryClient, variables.contentId);
      toast.success(
        variables.hasExisting
          ? 'Course updated successfully'
          : 'Course created successfully'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File;
      type: string;
    }): Promise<{
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      originalName: string;
    }> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSubmitForReview() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string): Promise<MentorContent> =>
      trpcClient.content.submitForReview.mutate({ contentId }),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Content submitted for review');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useArchiveContent() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'archive' | 'restore';
      statusBeforeArchive?: string;
    }): Promise<MentorContent> =>
      trpcClient.content.archive.mutate({
        contentId: id,
        action,
      }),
    onSuccess: async (_result, variables) => {
      await invalidateContentQueries(queryClient, variables.id);
      toast.success(
        variables.action === 'archive' ? 'Content archived' : 'Content restored'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateModule() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateModuleInput) =>
      trpcClient.content.createModule.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateContentQueries(queryClient, variables.contentId);
      toast.success('Module created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateModule() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateModuleInput) =>
      trpcClient.content.updateModule.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateContentQueries(queryClient, variables.contentId);
      toast.success('Module updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteModule() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteModuleInput) =>
      trpcClient.content.deleteModule.mutate(input),
    onSuccess: async (_result, variables) => {
      await invalidateContentQueries(queryClient, variables.contentId);
      toast.success('Module deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateSection() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSectionInput) =>
      trpcClient.content.createSection.mutate(input),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Section created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSection() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSectionInput) =>
      trpcClient.content.updateSection.mutate(input),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Section updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSection() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteSectionInput) =>
      trpcClient.content.deleteSection.mutate(input),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Section deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateContentItem() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContentItemInput) =>
      trpcClient.content.createContentItem.mutate(input),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Content item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContentItem() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateContentItemInput) =>
      trpcClient.content.updateContentItem.mutate(input),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Content item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteContentItem() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteContentItemInput) =>
      trpcClient.content.deleteContentItem.mutate(input),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient);
      toast.success('Content item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useProfileContentList() {
  const trpcClient = useTRPCClient();

  return useQuery({
    queryKey: contentKeys.profile,
    queryFn: async (): Promise<ProfileContentItem[]> =>
      trpcClient.content.profileList.query(),
  });
}

export function useUpdateProfileContent() {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) =>
      trpcClient.content.profileUpdate.mutate({ contentIds }),
    onSuccess: async () => {
      await Promise.all([
        invalidateContentQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: contentKeys.profile }),
      ]);
      toast.success('Profile content updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
