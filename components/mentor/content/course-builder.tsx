"use client";

import { useState, useCallback, useMemo, memo } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Book, FileText, Video, Link as LinkIcon, Type, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useContent, MentorContent } from '@/hooks/queries/use-content-queries';
import { useQueryClient } from '@tanstack/react-query';
import { CreateCourseDialog } from './create-course-dialog';
import { CreateModuleDialog } from './create-module-dialog';
import { CreateSectionDialog } from './create-section-dialog';
import { CreateContentItemDialog } from './create-content-item-dialog';
import { EditItemDialog } from './edit-item-dialog';
import { ReorderableModules } from './reorderable-modules';
import { CourseStructureSkeleton, CourseDetailsSkeleton } from './course-structure-skeleton';

interface CourseBuilderProps {
  content: MentorContent;
  onBack: () => void;
}

// Simple utility function for content item icons
const getContentItemIcon = (type: string) => {
  switch (type) {
    case 'VIDEO':
      return <Video className="h-4 w-4" />;
    case 'PDF':
    case 'DOCUMENT':
      return <FileText className="h-4 w-4" />;
    case 'URL':
      return <LinkIcon className="h-4 w-4" />;
    case 'TEXT':
      return <Type className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export const CourseBuilder = memo(({ content, onBack }: CourseBuilderProps) => {
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState('');
  const [createContentItemOpen, setCreateContentItemOpen] = useState('');
  const [activeTab, setActiveTab] = useState('structure');
  const [editingItem, setEditingItem] = useState<{type: string, data: any} | null>(null);
  
  const { data: fullContent, isLoading } = useContent(content.id);
  const queryClient = useQueryClient();
  
  // Memoize event handlers to prevent unnecessary re-renders
  const handleEdit = useCallback((type: string, data: any) => {
    setEditingItem({ type, data });
  }, []);
  
  const handleReorderModules = useCallback(async (reorderedModules: any[]) => {
    try {
      // Update module order indices on the server
      await Promise.all(
        reorderedModules.map((module, index) =>
          fetch(`/api/mentors/content/${content.id}/course/modules/${module.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIndex: index }),
          })
        )
      );
      
      // Refresh the content data
      queryClient.invalidateQueries({ queryKey: ['mentor-content', content.id] });
    } catch (error) {
      console.error('Error reordering modules:', error);
      // Revert the UI change if the API call fails
      queryClient.invalidateQueries({ queryKey: ['mentor-content', content.id] });
    }
  }, [content.id, queryClient]);
  
  const handleDelete = useCallback(async (type: string, data: any) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      let endpoint = '';
      if (type === 'module') {
        endpoint = `/api/mentors/content/${content.id}/course/modules/${data.id}`;
      } else if (type === 'section') {
        endpoint = `/api/mentors/content/modules/${data.moduleId}/sections/${data.id}`;
      } else if (type === 'contentItem') {
        endpoint = `/api/mentors/content/sections/${data.sectionId}/content-items/${data.id}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }
      
      // Refresh the content data using React Query
      queryClient.invalidateQueries({ queryKey: ['mentor-content', content.id] });
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Failed to delete ${type}. Please try again.`);
    }
  }, [content.id, queryClient]);
  
  // Memoize dialog handlers
  const handleCreateSectionOpen = useCallback((moduleId: string) => {
    setCreateSectionOpen(moduleId);
  }, []);
  
  const handleCreateContentItemOpen = useCallback((sectionId: string) => {
    setCreateContentItemOpen(sectionId);
  }, []);
  
  const handleCreateCourseOpen = useCallback(() => {
    setCreateCourseOpen(true);
  }, []);
  
  const handleCreateModuleOpen = useCallback(() => {
    setCreateModuleOpen(true);
  }, []);
  
  // Memoize computed values
  const hasCourse = useMemo(() => !!fullContent?.course, [fullContent?.course]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content
          </Button>
        </div>
        <Tabs value="structure">
          <TabsList>
            <TabsTrigger value="structure">Course Structure</TabsTrigger>
            <TabsTrigger value="details">Course Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="structure" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Structure</CardTitle>
                    <CardDescription>
                      Organize your course into modules and sections
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CourseStructureSkeleton />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Book className="h-8 w-8" />
              {content.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {content.description || 'Course management and structure'}
            </p>
          </div>
        </div>
        
        {!hasCourse && (
          <Button onClick={() => setCreateCourseOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Setup Course Details
          </Button>
        )}
      </div>
      
      {!hasCourse ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Book className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Setup Course Details</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Before you can add modules and content, you need to set up the basic course information like difficulty level, pricing, and learning outcomes.
            </p>
            <Button onClick={() => setCreateCourseOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Setup Course Details
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="structure">Course Structure</TabsTrigger>
            <TabsTrigger value="details">Course Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="structure" className="space-y-6">
            {/* Course Structure */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Structure</CardTitle>
                    <CardDescription>
                      Organize your course into modules and sections
                    </CardDescription>
                  </div>
                  <Button onClick={() => setCreateModuleOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!fullContent.course?.modules?.length ? (
                  <div className="text-center py-8">
                    <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No modules yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your course by adding the first module
                    </p>
                    <Button onClick={() => setCreateModuleOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Module
                    </Button>
                  </div>
                ) : (
                  <ReorderableModules
                    modules={fullContent.course.modules}
                    onReorder={handleReorderModules}
                    onEdit={(module) => handleEdit('module', module)}
                    onDelete={(module) => handleDelete('module', module)}
                    onCreateSection={(moduleId) => setCreateSectionOpen(moduleId)}
                    onEditSection={(section) => handleEdit('section', section)}
                    onDeleteSection={(section) => handleDelete('section', section)}
                    onCreateContentItem={(sectionId) => setCreateContentItemOpen(sectionId)}
                    onEditContentItem={(item) => handleEdit('contentItem', item)}
                    onDeleteContentItem={(item, sectionId) => handleDelete('contentItem', {...item, sectionId})}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details">
            {/* Course Details */}
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>
                  Manage course details, pricing, and metadata
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <CourseDetailsSkeleton />
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Difficulty:</span> {fullContent.course.difficulty}</div>
                          <div><span className="font-medium">Category:</span> {fullContent.course.category || 'Not set'}</div>
                          <div><span className="font-medium">Duration:</span> {fullContent.course.duration ? `${fullContent.course.duration} minutes` : 'Not set'}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Pricing</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Price:</span> {fullContent.course.price ? `${fullContent.course.currency} ${fullContent.course.price}` : 'Free'}</div>
                          <div><span className="font-medium">Enrollments:</span> {fullContent.course.enrollmentCount}</div>
                        </div>
                      </div>
                    </div>
                    
                    {fullContent.course.tags && JSON.parse(fullContent.course.tags).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(fullContent.course.tags).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {fullContent.course.learningOutcomes && JSON.parse(fullContent.course.learningOutcomes).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Learning Outcomes</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {JSON.parse(fullContent.course.learningOutcomes).map((outcome: string, index: number) => (
                            <li key={index}>{outcome}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <Button onClick={() => setCreateCourseOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Course Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Dialogs */}
      {createCourseOpen && (
        <CreateCourseDialog
          contentId={content.id}
          existingCourse={fullContent?.course}
          open={createCourseOpen}
          onOpenChange={setCreateCourseOpen}
        />
      )}
      
      {createModuleOpen && (
        <CreateModuleDialog
          contentId={content.id}
          open={createModuleOpen}
          onOpenChange={setCreateModuleOpen}
        />
      )}
      
      {createSectionOpen && (
        <CreateSectionDialog
          moduleId={createSectionOpen}
          open={!!createSectionOpen}
          onOpenChange={(open) => !open && setCreateSectionOpen('')}
        />
      )}
      
      {createContentItemOpen && (
        <CreateContentItemDialog
          sectionId={createContentItemOpen}
          open={!!createContentItemOpen}
          onOpenChange={(open) => !open && setCreateContentItemOpen('')}
        />
      )}
      
      {editingItem && (
        <EditItemDialog
          type={editingItem.type}
          data={editingItem.data}
          contentId={content.id}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}
    </div>
  );
});