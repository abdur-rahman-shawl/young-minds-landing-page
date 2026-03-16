"use client";

import { useState, useMemo, useCallback, memo } from 'react';
import { Plus, Book, FileText, Link, MoreVertical, Edit, Trash2, Upload, Send, Archive, RotateCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContentList, useDeleteContent, useSubmitForReview, useArchiveContent, MentorContent as ContentType } from '@/hooks/queries/use-content-queries';
import { CreateContentDialog } from './create-content-dialog';
import { EditContentDialog } from './edit-content-dialog';
import { CourseBuilder } from './course-builder';
import { MentorContentErrorBoundary, useMentorContentErrorHandler } from './mentor-content-error-boundary';
import { formatDistanceToNow } from 'date-fns';

const getContentIcon = (type: string) => {
  switch (type) {
    case 'COURSE': return <Book className="h-4 w-4" />;
    case 'FILE': return <FileText className="h-4 w-4" />;
    case 'URL': return <Link className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
    case 'PENDING_REVIEW': return 'bg-amber-100 text-amber-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'PENDING_REVIEW': return 'Pending Review';
    case 'APPROVED': return 'Approved';
    case 'REJECTED': return 'Rejected';
    case 'DRAFT': return 'Draft';
    case 'ARCHIVED': return 'Archived';
    default: return status;
  }
};

interface ContentCardProps {
  content: ContentType;
  onEdit: (content: ContentType) => void;
  onDelete: (id: string) => void;
  onOpenCourse: (content: ContentType) => void;
  onSubmitForReview: (id: string) => void;
  onArchive: (id: string, currentStatus: string) => void;
  onRestore: (id: string, statusBeforeArchive?: string) => void;
}

const ContentCard = memo(({ content, onEdit, onDelete, onOpenCourse, onSubmitForReview, onArchive, onRestore }: ContentCardProps) => {
  const formattedDate = useMemo(() => 
    formatDistanceToNow(new Date(content.updatedAt), { addSuffix: true }),
    [content.updatedAt]
  );
  
  const statusColor = useMemo(() => getStatusColor(content.status), [content.status]);
  const statusLabel = useMemo(() => getStatusLabel(content.status), [content.status]);
  const contentIcon = useMemo(() => getContentIcon(content.type), [content.type]);
  
  const canEdit = content.status === 'DRAFT' || content.status === 'REJECTED';
  const canSubmit = content.status === 'DRAFT' || content.status === 'REJECTED';
  const canArchive = content.status !== 'ARCHIVED' && content.status !== 'PENDING_REVIEW';
  const canRestore = content.status === 'ARCHIVED';
  
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
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(content)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {content.type === 'COURSE' && (
                <DropdownMenuItem onClick={() => onOpenCourse(content)}>
                  <Book className="h-4 w-4 mr-2" />
                  Manage Course
                </DropdownMenuItem>
              )}
              {canSubmit && (
                <DropdownMenuItem onClick={() => onSubmitForReview(content.id)}>
                  <Send className="h-4 w-4 mr-2" />
                  {content.status === 'REJECTED' ? 'Resubmit for Review' : 'Submit for Review'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canArchive && (
                <DropdownMenuItem onClick={() => onArchive(content.id, content.status)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              {canRestore && (
                <DropdownMenuItem onClick={() => onRestore(content.id, content.statusBeforeArchive)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(content.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Rejection feedback banner */}
        {content.status === 'REJECTED' && content.reviewNote && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Admin feedback: </span>{content.reviewNote}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={statusColor}>
              {statusLabel}
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
  const submitForReviewMutation = useSubmitForReview();
  const archiveContentMutation = useArchiveContent();
  const { handleError } = useMentorContentErrorHandler();
  
  const handleEdit = useCallback((content: ContentType) => {
    try {
      setEditingContent(content);
    } catch (error) {
      handleError(error as Error, 'content-edit');
    }
  }, [handleError]);
  
  const handleDelete = useCallback(async (id: string) => {
    try {
      if (confirm('Are you sure you want to delete this content? This cannot be undone.')) {
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

  const handleSubmitForReview = useCallback((id: string) => {
    if (confirm('Submit this content for admin review? You won\'t be able to edit it while it\'s under review.')) {
      submitForReviewMutation.mutate(id);
    }
  }, [submitForReviewMutation]);

  const handleArchive = useCallback((id: string, currentStatus: string) => {
    if (confirm('Archive this content? It will be hidden but can be restored later.')) {
      archiveContentMutation.mutate({ id, action: 'archive', statusBeforeArchive: currentStatus });
    }
  }, [archiveContentMutation]);

  const handleRestore = useCallback((id: string, statusBeforeArchive?: string) => {
    archiveContentMutation.mutate({ id, action: 'restore', statusBeforeArchive });
  }, [archiveContentMutation]);
  
  const handleCreateDialogOpen = useCallback(() => setCreateDialogOpen(true), []);
  const handleCreateDialogClose = useCallback(() => setCreateDialogOpen(false), []);
  const handleEditDialogClose = useCallback(() => setEditingContent(null), []);
  const handleCourseBuilderBack = useCallback(() => setCourseBuilderContent(null), []);
  
  // Filter by tab — "all" shows everything except archived, "archived" shows only archived
  const filteredContent = useMemo(() => {
    return content.filter((item: ContentType) => {
      if (activeTab === 'all') return item.status !== 'ARCHIVED';
      if (activeTab === 'pending') return item.status === 'PENDING_REVIEW';
      if (activeTab === 'approved') return item.status === 'APPROVED';
      if (activeTab === 'rejected') return item.status === 'REJECTED';
      if (activeTab === 'archived') return item.status === 'ARCHIVED';
      return item.type === activeTab.toUpperCase();
    });
  }, [content, activeTab]);
  
  const tabCounts = useMemo(() => {
    return {
      all: content.filter((item: ContentType) => item.status !== 'ARCHIVED').length,
      pending: content.filter((item: ContentType) => item.status === 'PENDING_REVIEW').length,
      approved: content.filter((item: ContentType) => item.status === 'APPROVED').length,
      rejected: content.filter((item: ContentType) => item.status === 'REJECTED').length,
      archived: content.filter((item: ContentType) => item.status === 'ARCHIVED').length,
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
          <TabsTrigger value="all">
            All {tabCounts.all > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{tabCounts.all}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending {tabCounts.pending > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs bg-amber-100 text-amber-800">{tabCounts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved {tabCounts.approved > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs bg-green-100 text-green-800">{tabCounts.approved}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected {tabCounts.rejected > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs bg-red-100 text-red-800">{tabCounts.rejected}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived {tabCounts.archived > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{tabCounts.archived}</Badge>}
          </TabsTrigger>
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
                  {activeTab === 'all' ? 'No content yet' : `No ${activeTab} content`}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === 'all' 
                    ? 'Start creating content to share with your mentees' 
                    : activeTab === 'rejected'
                    ? 'No rejected content — great job!'
                    : activeTab === 'pending'
                    ? 'No content pending review'
                    : activeTab === 'archived'
                    ? 'No archived content'
                    : 'No approved content yet. Submit content for admin review to get it approved.'
                  }
                </p>
                {activeTab === 'all' && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Content
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map((item: ContentType) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenCourse={handleOpenCourse}
                  onSubmitForReview={handleSubmitForReview}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
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