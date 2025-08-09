"use client";

import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Edit, Trash2, Video, FileText, Link as LinkIcon, Type, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseModule } from '@/hooks/queries/use-content-queries';
import { VideoPreviewDialog } from './video-preview-dialog';
import { RichTooltip } from '@/components/ui/rich-tooltip';
import { cn } from '@/lib/utils';

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

interface SortableModuleItemProps {
  module: CourseModule & { sections?: any[] };
  index: number;
  onEdit: (module: any) => void;
  onDelete: (module: any) => void;
  onCreateSection: (moduleId: string) => void;
  onEditSection?: (section: any) => void;
  onDeleteSection?: (section: any) => void;
  onCreateContentItem?: (sectionId: string) => void;
  onEditContentItem?: (item: any) => void;
  onDeleteContentItem?: (item: any, sectionId: string) => void;
}

function SortableModuleItem({ 
  module, 
  index, 
  onEdit, 
  onDelete, 
  onCreateSection,
  onEditSection,
  onDeleteSection,
  onCreateContentItem,
  onEditContentItem,
  onDeleteContentItem
}: SortableModuleItemProps) {
  const [videoPreview, setVideoPreview] = useState<{
    open: boolean;
    videoUrl: string;
    title: string;
    description?: string;
  }>({
    open: false,
    videoUrl: '',
    title: '',
    description: undefined,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleVideoPreview = (item: any) => {
    if (item.type === 'VIDEO' && item.fileUrl) {
      setVideoPreview({
        open: true,
        videoUrl: item.fileUrl,
        title: item.title,
        description: item.description,
      });
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className={`border-l-4 border-l-blue-500 ${isDragging ? 'shadow-lg' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
              aria-describedby="DragHandle"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <Badge variant="outline">
              Module {index + 1}
            </Badge>
            <CardTitle className="text-base">{module.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {module.sections?.length || 0} sections
            </Badge>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEdit(module)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCreateSection(module.id)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Section
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelete(module)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
        {module.description && (
          <CardDescription>{module.description}</CardDescription>
        )}
      </CardHeader>
      
      {module.sections?.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {module.sections.map((section, sectionIndex) => (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <Badge variant="outline" className="text-xs w-6 h-6 p-0 flex items-center justify-center">
                    {sectionIndex + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{section.title}</div>
                    {section.description && (
                      <div className="text-xs text-muted-foreground">
                        {section.description}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {section.contentItems?.length || 0} items
                  </Badge>
                  {onEditSection && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onEditSection(section)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {onCreateContentItem && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onCreateContentItem(section.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Content
                    </Button>
                  )}
                  {onDeleteSection && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onDeleteSection(section)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
                
                {/* Content Items */}
                {section.contentItems && section.contentItems.length > 0 && (
                  <div className="ml-8 space-y-1">
                    {section.contentItems.map((item: any, itemIndex: number) => {
                      const handleUrlClick = (url: string, e: React.MouseEvent) => {
                        console.log('URL click triggered:', url);
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(url, '_blank', 'noopener,noreferrer');
                      };

                      const ContentWrapper = item.type === 'URL' && item.content ? 
                        ({ children }: { children: React.ReactNode }) => (
                          <RichTooltip 
                            url={item.content} 
                            title={item.title}
                            description={item.description}
                          >
                            <div 
                              onClick={(e) => handleUrlClick(item.content, e)}
                              className="cursor-pointer"
                            >
                              {children}
                            </div>
                          </RichTooltip>
                        ) : 
                        ({ children }: { children: React.ReactNode }) => <>{children}</>;

                      return (
                        <ContentWrapper key={item.id}>
                          <div className={cn(
                            "flex items-center gap-2 p-2 bg-white border rounded text-sm transition-colors",
                            item.type === 'URL' && item.content 
                              ? "hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm" 
                              : "hover:bg-gray-50"
                          )}>
                            <Badge variant="outline" className="text-xs w-5 h-5 p-0 flex items-center justify-center">
                              {itemIndex + 1}
                            </Badge>
                            {getContentItemIcon(item.type)}
                            <div className="flex-1">
                              <span className="font-medium">{item.title}</span>
                              {item.description && (
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                              )}
                              {item.type === 'URL' && item.content && (
                                <div className="text-xs text-blue-600 hover:text-blue-800">
                                  Click to open: {(() => {
                                    try {
                                      return new URL(item.content).hostname;
                                    } catch {
                                      return item.content;
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.type}
                        </Badge>
                        {item.duration && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(item.duration / 60)}min
                          </Badge>
                        )}
                        {item.type === 'VIDEO' && item.fileUrl && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVideoPreview(item)}
                            title="Preview video"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {item.type === 'URL' && item.content && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => handleUrlClick(item.content, e)}
                            title="Open URL"
                          >
                            <LinkIcon className="h-3 w-3" />
                          </Button>
                        )}
                        {onEditContentItem && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => onEditContentItem(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteContentItem && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => onDeleteContentItem(item, section.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        )}
                          </div>
                        </ContentWrapper>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
      
      <VideoPreviewDialog
        open={videoPreview.open}
        onOpenChange={(open) => setVideoPreview(prev => ({ ...prev, open }))}
        videoUrl={videoPreview.videoUrl}
        title={videoPreview.title}
        description={videoPreview.description}
      />
    </Card>
  );
}

interface ReorderableModulesProps {
  modules: (CourseModule & { sections?: any[] })[];
  onReorder: (modules: (CourseModule & { sections?: any[] })[]) => void;
  onEdit: (module: any) => void;
  onDelete: (module: any) => void;
  onCreateSection: (moduleId: string) => void;
  onEditSection?: (section: any) => void;
  onDeleteSection?: (section: any) => void;
  onCreateContentItem?: (sectionId: string) => void;
  onEditContentItem?: (item: any) => void;
  onDeleteContentItem?: (item: any, sectionId: string) => void;
}

export const ReorderableModules = memo(({ 
  modules, 
  onReorder, 
  onEdit, 
  onDelete, 
  onCreateSection,
  onEditSection,
  onDeleteSection,
  onCreateContentItem,
  onEditContentItem,
  onDeleteContentItem
}: ReorderableModulesProps) => {
  const [items, setItems] = useState(modules);
  
  React.useEffect(() => {
    setItems(modules);
  }, [modules]);

  // Define sensors at top level (hooks must be called at top level)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize drag end handler to prevent unnecessary re-creation
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over?.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update order indices
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        orderIndex: index,
      }));
      
      setItems(updatedItems);
      onReorder(updatedItems);
    }
  }, [items, onReorder]);
  
  // Memoize item IDs to prevent unnecessary SortableContext re-renders
  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {items.map((module, index) => (
            <SortableModuleItem
              key={module.id}
              module={module}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSection={onCreateSection}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              onCreateContentItem={onCreateContentItem}
              onEditContentItem={onEditContentItem}
              onDeleteContentItem={onDeleteContentItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});