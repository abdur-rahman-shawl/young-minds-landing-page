"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, FileText, Video, Link as LinkIcon, Plus, Target, Clock, Users, ChevronRight, Save, Loader2, Layers, Type } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const createSectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(300, 'Description must be less than 300 characters').optional(),
  orderIndex: z.number().min(0).default(0),
  estimatedDuration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  learningObjectives: z.array(z.string()).default([]),
  contentItems: z.array(z.object({
    type: z.enum(['VIDEO', 'DOCUMENT', 'TEXT', 'URL']),
    title: z.string(),
    description: z.string().optional(),
    estimatedDuration: z.number().optional(),
  })).default([]),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;

interface CreateSectionDialogProps {
  moduleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTION_TEMPLATES = [
  {
    id: 'lecture',
    title: 'Lecture Section',
    description: 'Traditional teaching with video and materials',
    icon: Video,
    color: 'bg-blue-50 border-blue-200',
    defaultTitle: 'Lecture: Core Concepts',
    contentItems: [
      { type: 'VIDEO', title: 'Main Lecture Video', estimatedDuration: 15 },
      { type: 'DOCUMENT', title: 'Lecture Notes', estimatedDuration: 5 },
      { type: 'TEXT', title: 'Key Takeaways', estimatedDuration: 2 },
    ],
    objectives: [
      'Understand the fundamental concepts',
      'Apply theoretical knowledge',
      'Identify key principles'
    ]
  },
  {
    id: 'practical',
    title: 'Hands-on Practice',
    description: 'Interactive exercises and activities',
    icon: Users,
    color: 'bg-green-50 border-green-200',
    defaultTitle: 'Practice Session',
    contentItems: [
      { type: 'TEXT', title: 'Exercise Instructions', estimatedDuration: 3 },
      { type: 'DOCUMENT', title: 'Practice Materials', estimatedDuration: 20 },
      { type: 'URL', title: 'Additional Resources', estimatedDuration: 5 },
    ],
    objectives: [
      'Practice hands-on skills',
      'Build practical experience',
      'Reinforce learning through doing'
    ]
  },
  {
    id: 'reading',
    title: 'Reading & Research',
    description: 'Text-based learning with documents',
    icon: BookOpen,
    color: 'bg-purple-50 border-purple-200',
    defaultTitle: 'Reading Assignment',
    contentItems: [
      { type: 'DOCUMENT', title: 'Required Reading', estimatedDuration: 15 },
      { type: 'TEXT', title: 'Study Guide', estimatedDuration: 5 },
      { type: 'URL', title: 'Supplementary Articles', estimatedDuration: 10 },
    ],
    objectives: [
      'Develop deep understanding through reading',
      'Research additional perspectives',
      'Synthesize information from multiple sources'
    ]
  },
  {
    id: 'mixed',
    title: 'Mixed Media',
    description: 'Combination of different content types',
    icon: Layers,
    color: 'bg-orange-50 border-orange-200',
    defaultTitle: 'Comprehensive Overview',
    contentItems: [
      { type: 'VIDEO', title: 'Introduction Video', estimatedDuration: 8 },
      { type: 'DOCUMENT', title: 'Study Materials', estimatedDuration: 12 },
      { type: 'TEXT', title: 'Summary Notes', estimatedDuration: 3 },
      { type: 'URL', title: 'External Resources', estimatedDuration: 7 },
    ],
    objectives: [
      'Engage with multiple learning modalities',
      'Reinforce concepts through variety',
      'Accommodate different learning styles'
    ]
  },
];

const CONTENT_TYPE_ICONS = {
  VIDEO: Video,
  DOCUMENT: FileText,
  TEXT: Type,
  URL: LinkIcon,
};

export function CreateSectionDialog({ moduleId, open, onOpenChange }: CreateSectionDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('template');
  const queryClient = useQueryClient();
  
  const createSectionMutation = useMutation({
    mutationFn: async (data: CreateSectionForm) => {
      const response = await fetch(`/api/mentors/content/modules/${moduleId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create section');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
      toast.success('Section created successfully!');
      onOpenChange(false);
      form.reset();
      setSelectedTemplate(null);
      setActiveTab('template');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const form = useForm<CreateSectionForm>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      orderIndex: 0,
      learningObjectives: [],
      contentItems: [],
    },
  });
  
  const handleTemplateSelect = (templateId: string) => {
    const template = SECTION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      form.setValue('title', template.defaultTitle);
      form.setValue('description', template.description);
      form.setValue('learningObjectives', template.objectives);
      form.setValue('contentItems', template.contentItems as any[]);
      form.setValue('estimatedDuration', 
        template.contentItems.reduce((sum, item) => sum + (item.estimatedDuration || 0), 0)
      );
      setActiveTab('details');
    }
  };
  
  const addContentItem = () => {
    const currentItems = form.getValues('contentItems');
    form.setValue('contentItems', [
      ...currentItems,
      { type: 'TEXT', title: 'New Content Item', description: '', estimatedDuration: 5 }
    ]);
  };
  
  const removeContentItem = (index: number) => {
    const currentItems = form.getValues('contentItems');
    form.setValue('contentItems', currentItems.filter((_, i) => i !== index));
  };
  
  const updateContentItem = (index: number, field: string, value: any) => {
    const currentItems = form.getValues('contentItems');
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    form.setValue('contentItems', updatedItems);
  };
  
  const addObjective = () => {
    const currentObjectives = form.getValues('learningObjectives');
    form.setValue('learningObjectives', [...currentObjectives, 'New learning objective']);
  };
  
  const removeObjective = (index: number) => {
    const currentObjectives = form.getValues('learningObjectives');
    form.setValue('learningObjectives', currentObjectives.filter((_, i) => i !== index));
  };
  
  const updateObjective = (index: number, value: string) => {
    const currentObjectives = form.getValues('learningObjectives');
    const updatedObjectives = [...currentObjectives];
    updatedObjectives[index] = value;
    form.setValue('learningObjectives', updatedObjectives);
  };
  
  const onSubmit = (data: CreateSectionForm) => {
    createSectionMutation.mutate(data);
  };
  
  const isLoading = createSectionMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Section</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Design a section with learning objectives and content structure
          </p>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Choose Template</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedTemplate}>
              Section Details
            </TabsTrigger>
            <TabsTrigger value="structure" disabled={!selectedTemplate}>
              Content Structure
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="template" className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Select a Section Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTION_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;
                  
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : template.color
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? 'bg-blue-100' : 'bg-white'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              isSelected ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.title}</h4>
                              {isSelected && <ChevronRight className="h-4 w-4 text-blue-600" />}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {template.contentItems.length} items
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {template.contentItems.reduce((sum, item) => sum + (item.estimatedDuration || 0), 0)} min
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Title *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Introduction to React Hooks"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Clear, descriptive title for this section
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what students will learn in this section"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/300 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="orderIndex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Section sequence (0 = first)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="estimatedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="30"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Estimated completion time
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">Learning Objectives</CardTitle>
                          <CardDescription>
                            What will students achieve?
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addObjective}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {form.watch('learningObjectives').length > 0 ? (
                        <div className="space-y-2">
                          {form.watch('learningObjectives').map((objective, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
                              <Target className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <Input
                                value={objective}
                                onChange={(e) => updateObjective(index, e.target.value)}
                                className="text-sm border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                                placeholder="Learning objective"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="p-1 h-auto"
                                onClick={() => removeObjective(index)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No learning objectives yet</p>
                          <p className="text-xs">Click "Add" to create objectives</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="structure" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Content Structure</h3>
                  <p className="text-sm text-gray-600">Design the learning materials for this section</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addContentItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content Item
                </Button>
              </div>
              
              {form.watch('contentItems').length > 0 ? (
                <div className="space-y-3">
                  {form.watch('contentItems').map((item, index) => {
                    const Icon = CONTENT_TYPE_ICONS[item.type as keyof typeof CONTENT_TYPE_ICONS];
                    
                    return (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded">
                              <Icon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                  value={item.title}
                                  onChange={(e) => updateContentItem(index, 'title', e.target.value)}
                                  placeholder="Content title"
                                  className="font-medium"
                                />
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.estimatedDuration || ''}
                                    onChange={(e) => updateContentItem(index, 'estimatedDuration', parseInt(e.target.value) || 0)}
                                    placeholder="Duration (min)"
                                    className="w-24"
                                  />
                                  <select
                                    value={item.type}
                                    onChange={(e) => updateContentItem(index, 'type', e.target.value)}
                                    className="px-3 py-2 border rounded-md text-sm"
                                  >
                                    <option value="VIDEO">Video</option>
                                    <option value="DOCUMENT">Document</option>
                                    <option value="TEXT">Text</option>
                                    <option value="URL">URL</option>
                                  </select>
                                </div>
                              </div>
                              <Textarea
                                value={item.description || ''}
                                onChange={(e) => updateContentItem(index, 'description', e.target.value)}
                                placeholder="Brief description of this content item"
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContentItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Layers className="h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="font-medium text-gray-600 mb-2">No content items yet</h4>
                    <p className="text-sm text-gray-500 text-center mb-4">
                      Add content items to structure your section
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addContentItem}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Content Item
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {activeTab === 'template' ? (
            <Button 
              disabled={!selectedTemplate}
              onClick={() => setActiveTab('details')}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Section
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}