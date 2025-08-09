"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Clock, Users, Target, Save, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  orderIndex: z.number().min(0).default(0),
  estimatedDuration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  learningObjectives: z.array(z.string()).default([]),
});

type CreateModuleForm = z.infer<typeof createModuleSchema>;

interface CreateModuleDialogProps {
  contentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODULE_TEMPLATES = [
  {
    id: 'introduction',
    title: 'Introduction Module',
    description: 'Welcome students and set expectations',
    icon: BookOpen,
    defaultTitle: 'Getting Started',
    objectives: [
      'Understand course objectives',
      'Navigate the learning platform',
      'Connect with other students'
    ]
  },
  {
    id: 'core-concepts',
    title: 'Core Concepts',
    description: 'Teach fundamental principles',
    icon: Target,
    defaultTitle: 'Core Concepts',
    objectives: [
      'Master key terminology',
      'Apply fundamental principles',
      'Build foundational knowledge'
    ]
  },
  {
    id: 'practical',
    title: 'Hands-on Practice',
    description: 'Interactive exercises and projects',
    icon: Users,
    defaultTitle: 'Practical Application',
    objectives: [
      'Complete practical exercises',
      'Build real-world projects',
      'Apply learned concepts'
    ]
  },
  {
    id: 'assessment',
    title: 'Assessment & Review',
    description: 'Test knowledge and provide feedback',
    icon: Clock,
    defaultTitle: 'Knowledge Check',
    objectives: [
      'Assess understanding',
      'Receive personalized feedback',
      'Identify improvement areas'
    ]
  },
];

export function CreateModuleDialog({ contentId, open, onOpenChange }: CreateModuleDialogProps) {
  const queryClient = useQueryClient();
  
  const createModuleMutation = useMutation({
    mutationFn: async (data: CreateModuleForm) => {
      const response = await fetch(`/api/mentors/content/${contentId}/course/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create module');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content', contentId] });
      toast.success('Module created successfully!');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const form = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: {
      orderIndex: 0,
      learningObjectives: [],
    },
  });
  
  const handleTemplateSelect = (template: typeof MODULE_TEMPLATES[0]) => {
    form.setValue('title', template.defaultTitle);
    form.setValue('description', template.description);
    form.setValue('learningObjectives', template.objectives);
  };
  
  const onSubmit = (data: CreateModuleForm) => {
    createModuleMutation.mutate(data);
  };
  
  const isLoading = createModuleMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Module</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <h3 className="font-semibold mb-3">Choose a Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODULE_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{template.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.objectives.slice(0, 2).map((obj, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {obj.substring(0, 20)}...
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          
          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Module Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Getting Started, Advanced Concepts"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Clear, descriptive title for this module
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
                            placeholder="Describe what this module covers and its importance in the course"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0}/500 characters
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
                            Module sequence (0 = first)
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
                    <CardTitle className="text-sm">Learning Objectives</CardTitle>
                    <CardDescription>
                      What will students achieve in this module?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {form.watch('learningObjectives').length > 0 ? (
                      <div className="space-y-2">
                        {form.watch('learningObjectives').map((objective, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
                            <Target className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{objective}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-auto p-1 h-auto"
                              onClick={() => {
                                const current = form.getValues('learningObjectives');
                                form.setValue('learningObjectives', current.filter((_, i) => i !== index));
                              }}
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
                        <p className="text-xs">Select a template above to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Module
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}