"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
});

const sectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
});

const contentItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
  content: z.string().optional(),
  isPreview: z.boolean().optional(),
});

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  data: any;
  contentId?: string;
}

export function EditItemDialog({ open, onOpenChange, type, data, contentId }: EditItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  
  const getSchema = () => {
    switch (type) {
      case 'module': return moduleSchema;
      case 'section': return sectionSchema;
      case 'contentItem': return contentItemSchema;
      default: return moduleSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
      orderIndex: data?.orderIndex || 0,
      content: data?.content || '',
      isPreview: data?.isPreview || false,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        title: data.title || '',
        description: data.description || '',
        orderIndex: data.orderIndex || 0,
        content: data.content || '',
        isPreview: data.isPreview || false,
      });
    }
  }, [data, form]);

  const onSubmit = async (formData: any) => {
    setIsLoading(true);
    
    try {
      let endpoint = '';
      
      if (type === 'module') {
        endpoint = `/api/mentors/content/${contentId}/course/modules/${data.id}`;
      } else if (type === 'section') {
        endpoint = `/api/mentors/content/modules/${data.moduleId}/sections/${data.id}`;
      } else if (type === 'contentItem') {
        endpoint = `/api/mentors/content/sections/${data.sectionId}/content-items/${data.id}`;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${type}`);
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
      onOpenChange(false);
      
      // Refresh the content data using React Query
      if (contentId) {
        queryClient.invalidateQueries({ queryKey: ['mentor-content', contentId] });
      }
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      toast.error(`Failed to update ${type}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'module': return 'Edit Module';
      case 'section': return 'Edit Section';
      case 'contentItem': return 'Edit Content Item';
      default: return 'Edit Item';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Index</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {type === 'contentItem' && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter content"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update {type.charAt(0).toUpperCase() + type.slice(1)}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}