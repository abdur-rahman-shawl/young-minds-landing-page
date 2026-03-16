"use client";

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Book, FileText, Link as LinkIcon, GripVertical, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { MentorContent } from '@/hooks/queries/use-content-queries';

interface ProfileContentItem extends MentorContent {
  displayOrder?: number;
  addedAt?: string;
}

function useApprovedContent() {
  return useQuery<MentorContent[]>({
    queryKey: ['mentor-content'],
    queryFn: async () => {
      const response = await fetch('/api/mentors/content');
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json();
    },
    select: (data) => data.filter(item => item.status === 'APPROVED'),
  });
}

function useProfileContent() {
  return useQuery<ProfileContentItem[]>({
    queryKey: ['mentor-profile-content'],
    queryFn: async () => {
      const response = await fetch('/api/mentors/profile-content');
      if (!response.ok) throw new Error('Failed to fetch profile content');
      const json = await response.json();
      return json.data || [];
    },
  });
}

function useUpdateProfileContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const response = await fetch('/api/mentors/profile-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile content');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-profile-content'] });
      toast.success('Profile content updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'COURSE': return <Book className="h-4 w-4 text-blue-500" />;
    case 'FILE': return <FileText className="h-4 w-4 text-orange-500" />;
    case 'URL': return <LinkIcon className="h-4 w-4 text-green-500" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

export function ProfileContentSelector() {
  const { data: approvedContent = [], isLoading: loadingApproved } = useApprovedContent();
  const { data: profileContent = [], isLoading: loadingProfile } = useProfileContent();
  const updateMutation = useUpdateProfileContent();

  const selectedIds = useMemo(() => {
    return new Set(profileContent.map(item => item.id));
  }, [profileContent]);

  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(selectedIds);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when profile data loads
  useMemo(() => {
    setLocalSelectedIds(new Set(selectedIds));
    setHasChanges(false);
  }, [selectedIds]);

  const toggleItem = useCallback((id: string) => {
    setLocalSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    const orderedIds = approvedContent
      .filter(item => localSelectedIds.has(item.id))
      .map(item => item.id);
    
    updateMutation.mutate(orderedIds);
    setHasChanges(false);
  }, [approvedContent, localSelectedIds, updateMutation]);

  const isLoading = loadingApproved || loadingProfile;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-5 w-5 bg-gray-200 rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Profile Content
            </CardTitle>
            <CardDescription className="mt-1">
              Select which approved content to display on your public profile for mentees to see
            </CardDescription>
          </div>
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Selection'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {approvedContent.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No approved content yet</h3>
            <p className="text-muted-foreground text-sm">
              Submit your content for admin review first. Once approved, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {localSelectedIds.size} of {approvedContent.length} items selected
            </p>
            {approvedContent.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  localSelectedIds.has(item.id) 
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' 
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <Checkbox
                  checked={localSelectedIds.has(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="pointer-events-none"
                />
                {getContentIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
