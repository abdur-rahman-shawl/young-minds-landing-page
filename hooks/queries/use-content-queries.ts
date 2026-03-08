import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface MentorContent {
  id: string;
  title: string;
  description?: string;
  type: 'COURSE' | 'FILE' | 'URL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  urlTitle?: string;
  urlDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  contentId: string;
  ownerType?: 'MENTOR' | 'PLATFORM';
  ownerId?: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration?: number;
  price?: string;
  currency: string;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
  platformTags?: string[];
  platformName?: string | null;
  prerequisites?: string[];
  learningOutcomes?: string[];
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSection {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  orderIndex: number;
  contentItems?: ContentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  type: 'VIDEO' | 'PDF' | 'DOCUMENT' | 'URL' | 'TEXT';
  orderIndex: number;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

// Fetch all mentor content
export function useContentList() {
  return useQuery({
    queryKey: ['mentor-content'],
    queryFn: async (): Promise<MentorContent[]> => {
      const response = await fetch('/api/mentors/content');
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      return response.json();
    },
  });
}

// Fetch single content item with full details
export function useContent(contentId: string) {
  return useQuery({
    queryKey: ['mentor-content', contentId],
    queryFn: async (): Promise<MentorContent & { course?: Course & { modules: (CourseModule & { sections: CourseSection[] })[] } }> => {
      const response = await fetch(`/api/mentors/content/${contentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      return response.json();
    },
    enabled: !!contentId,
  });
}

// Create content
export function useCreateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<MentorContent>): Promise<MentorContent> => {
      const response = await fetch('/api/mentors/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create content');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
      toast.success('Content created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update content
export function useUpdateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MentorContent> }): Promise<MentorContent> => {
      const response = await fetch(`/api/mentors/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Update content error response:', error);
        const errorMessage = error.details 
          ? `Validation error: ${error.details.map((d: any) => d.message).join(', ')}`
          : error.error || 'Failed to update content';
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-content', id] });
      toast.success('Content updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete content
export function useDeleteContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/mentors/content/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete content');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
      toast.success('Content deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Create course
export function useSaveCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      contentId,
      data,
      hasExisting,
    }: {
      contentId: string;
      data: Partial<Course>;
      hasExisting: boolean;
    }): Promise<Course> => {
      const response = await fetch(`/api/mentors/content/${contentId}/course`, {
        method: hasExisting ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to create course';
        try {
          const error = await response.json();
          console.error('Course creation error:', error);
          errorMessage = error.error || error.message || errorMessage;
          if (error.details) {
            console.error('Validation details:', error.details);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (_, { contentId, hasExisting }) => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content', contentId] });
      toast.success(hasExisting ? 'Course updated successfully' : 'Course created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// File upload
export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }): Promise<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string; originalName: string }> => {
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
