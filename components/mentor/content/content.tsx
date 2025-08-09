"use client";

import { useState, useMemo, useCallback, memo } from 'react';
import { Plus, Book, FileText, Link, MoreVertical, Eye, Edit, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContentList, useDeleteContent, MentorContent as ContentType } from '@/hooks/queries/use-content-queries';
import { CreateContentDialog } from './create-content-dialog';
import { EditContentDialog } from './edit-content-dialog';
import { CourseBuilder } from './course-builder';
import { MentorContentErrorBoundary, useMentorContentErrorHandler } from './mentor-content-error-boundary';
import { formatDistanceToNow } from 'date-fns';

// Simple utility function for content icons
const getContentIcon = (type: string) => {
  switch (type) {
    case 'COURSE':
      return <Book className="h-4 w-4" />;
    case 'FILE':
      return <FileText className="h-4 w-4" />;
    case 'URL':
      return <Link className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// Use a plain function for simple string mapping (no need to memoize simple computations)
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-800';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface ContentCardProps {
  content: ContentType;
  onEdit: (content: ContentType) => void;
  onDelete: (id: string) => void;
  onOpenCourse: (content: ContentType) => void;
}

const ContentCard = memo(({ content, onEdit, onDelete, onOpenCourse }: ContentCardProps) => {
  // Memoize expensive computations
  const formattedDate = useMemo(() => 
    formatDistanceToNow(new Date(content.updatedAt), { addSuffix: true }),
    [content.updatedAt]
  );
  
  const statusColor = useMemo(() => 
    getStatusColor(content.status),
    [content.status]
  );
  
  const contentIcon = useMemo(() => 
    getContentIcon(content.type),
    [content.type]
  );
  
  // Memoize event handlers to prevent unnecessary re-renders
  const handleEdit = useCallback(() => {
    onEdit(content);
  }, [onEdit, content]);
  
  const handleDelete = useCallback(() => {
    onDelete(content.id);
  }, [onDelete, content.id]);
  
  const handleOpenCourse = useCallback(() => {
    onOpenCourse(content);
  }, [onOpenCourse, content]);
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {contentIcon}
            <div>
              <CardTitle className="text-lg">{content.title}</CardTitle>
              {content.description && (
                <CardDescription className="mt-1">
                  {content.description.length > 100
                    ? `${content.description.substring(0, 100)}...`
                    : content.description}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {content.type === 'COURSE' && (
                <DropdownMenuItem onClick={handleOpenCourse}>
                  <Book className="h-4 w-4 mr-2" />
                  Manage Course
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={statusColor}>
              {content.status}
            </Badge>
            <Badge variant="outline">
              {content.type}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {formattedDate}
          </span>
        </div>
        
        {content.type === 'FILE' && content.fileName && (
          <div className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium">File:</span> {content.fileName}
            {content.fileSize && (
              <span className="ml-2">({(content.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
            )}
          </div>
        )}
        
        {content.type === 'URL' && content.url && (
          <div className="mt-3">
            <a 
              href={content.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm break-all"
            >
              {content.urlTitle || content.url}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const MentorContent = memo(() => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentType | null>(null);
  const [courseBuilderContent, setCourseBuilderContent] = useState<ContentType | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: content = [], isLoading } = useContentList();
  const deleteContentMutation = useDeleteContent();
  const { handleError } = useMentorContentErrorHandler();
  
  // Memoize event handlers to prevent unnecessary re-renders of child components
  const handleEdit = useCallback((content: ContentType) => {
    try {
      setEditingContent(content);
    } catch (error) {
      handleError(error as Error, 'content-edit');
    }
  }, [handleError]);
  
  const handleDelete = useCallback(async (id: string) => {
    try {
      if (confirm('Are you sure you want to delete this content?')) {
        deleteContentMutation.mutate(id);
      }
    } catch (error) {
      handleError(error as Error, 'content-delete');
    }
  }, [deleteContentMutation, handleError]);
  
  const handleOpenCourse = useCallback((content: ContentType) => {
    try {
      setCourseBuilderContent(content);
    } catch (error) {
      handleError(error as Error, 'course-builder-open');
    }
  }, [handleError]);
  
  const handleCreateDialogOpen = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);
  
  const handleCreateDialogClose = useCallback(() => {
    setCreateDialogOpen(false);
  }, []);
  
  const handleEditDialogClose = useCallback(() => {
    setEditingContent(null);
  }, []);
  
  const handleCourseBuilderBack = useCallback(() => {
    setCourseBuilderContent(null);
  }, []);
  
  // Memoize filtered content to prevent unnecessary re-computation
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      if (activeTab === 'all') return true;
      return item.type === activeTab.toUpperCase();
    });
  }, [content, activeTab]);
  
  // Memoize tab counts for performance
  const tabCounts = useMemo(() => {
    return {
      all: content.length,
      course: content.filter(item => item.type === 'COURSE').length,
      file: content.filter(item => item.type === 'FILE').length,
      url: content.filter(item => item.type === 'URL').length,
    };
  }, [content]);
  
  if (courseBuilderContent) {
    return (
      <MentorContentErrorBoundary context="course-builder">
        <CourseBuilder 
          content={courseBuilderContent} 
          onBack={handleCourseBuilderBack}
        />
      </MentorContentErrorBoundary>
    );
  }
  
  return (
    <MentorContentErrorBoundary context="content-list">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Content</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage learning materials for your mentees
          </p>
        </div>
        <Button onClick={handleCreateDialogOpen}>
          <Plus className="h-4 w-4 mr-2" />
          Create Content
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="course">Courses</TabsTrigger>
          <TabsTrigger value="file">Files</TabsTrigger>
          <TabsTrigger value="url">URLs</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredContent.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === 'all' ? 'No content yet' : `No ${activeTab.toLowerCase()} content yet`}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start creating content to share with your mentees
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map((item) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenCourse={handleOpenCourse}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {editingContent && (
        <EditContentDialog
          content={editingContent}
          open={!!editingContent}
          onOpenChange={handleEditDialogClose}
        />
      )}
      
      <CreateContentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateDialogClose}
      />
    </div>
    </MentorContentErrorBoundary>
  );
}); 