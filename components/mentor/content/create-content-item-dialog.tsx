"use client";

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video, FileText, Type, Link as LinkIcon, Upload, X, Save, Loader2, Clock, Eye, Play, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MentorContentErrorBoundary, useMentorContentErrorHandler } from './mentor-content-error-boundary';

const contentItemSchema = z.object({
  type: z.enum(['VIDEO', 'DOCUMENT', 'TEXT', 'URL']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  orderIndex: z.number().min(0).default(0),
  estimatedDuration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  // For TEXT type
  textContent: z.string().optional(),
  // For URL type
  url: z.string().url('Please enter a valid URL').optional(),
  // For FILE/VIDEO type
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  // Additional metadata
  isRequired: z.boolean().default(true),
  allowDownload: z.boolean().default(true),
});

type ContentItemForm = z.infer<typeof contentItemSchema>;

interface CreateContentItemDialogProps {
  sectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTENT_TYPES = [
  {
    value: 'VIDEO',
    label: 'Video',
    description: 'Upload video files or embed video content',
    icon: Video,
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
    acceptedFiles: '.mp4,.mov,.avi,.wmv,.flv,.webm',
    maxSize: '500MB'
  },
  {
    value: 'DOCUMENT',
    label: 'Document',
    description: 'PDF, Word docs, presentations, images',
    icon: FileText,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    acceptedFiles: '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp',
    maxSize: '50MB'
  },
  {
    value: 'TEXT',
    label: 'Text Content',
    description: 'Rich text content, notes, instructions',
    icon: Type,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    acceptedFiles: null,
    maxSize: null
  },
  {
    value: 'URL',
    label: 'External Link',
    description: 'YouTube videos, articles, external resources',
    icon: LinkIcon,
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    acceptedFiles: null,
    maxSize: null
  },
];

export function CreateContentItemDialog({ sectionId, open, onOpenChange }: CreateContentItemDialogProps) {
  const [activeTab, setActiveTab] = useState('type');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();
  const { handleError } = useMentorContentErrorHandler();
  
  const createContentItemMutation = useMutation({
    mutationFn: async (data: ContentItemForm) => {
      const response = await fetch(`/api/mentors/content/sections/${sectionId}/content-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create content item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-content'] });
      toast.success('Content item created successfully!');
      onOpenChange(false);
      form.reset();
      setSelectedFile(null);
      setActiveTab('type');
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setUploadProgress(0);
    },
  });
  
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'content-item');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Upload failed');
        }
        
        return response.json();
      } catch (error) {
        handleError(error as Error, 'file-upload');
        throw error;
      }
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress(0);
    },
  });
  
  const form = useForm<ContentItemForm>({
    resolver: zodResolver(contentItemSchema),
    defaultValues: {
      type: 'TEXT',
      orderIndex: 0,
      isRequired: true,
      allowDownload: true,
    },
  });
  
  const watchedType = form.watch('type');
  const selectedContentType = CONTENT_TYPES.find(t => t.value === watchedType);
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!form.getValues('title')) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        form.setValue('title', nameWithoutExtension);
      }
    }
  }, [form]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!form.getValues('title')) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        form.setValue('title', nameWithoutExtension);
      }
    }
  }, [form]);
  
  const onSubmit = async (data: ContentItemForm) => {
    try {
      let finalData: any = {
        title: data.title,
        description: data.description,
        type: data.type,
        orderIndex: data.orderIndex,
        isPreview: !data.isRequired, // Convert isRequired to isPreview (inverse)
      };
      
      // Handle different content types
      if (data.type === 'TEXT') {
        finalData.content = data.textContent;
      } else if (data.type === 'URL') {
        finalData.content = data.url; // Backend expects 'content' field for URL
      } else if ((data.type === 'VIDEO' || data.type === 'DOCUMENT') && selectedFile) {
        setUploadProgress(10);
        const uploadResult = await uploadFileMutation.mutateAsync(selectedFile);
        setUploadProgress(70);
        
        finalData.fileUrl = uploadResult.fileUrl;
        finalData.fileName = uploadResult.fileName;
        finalData.fileSize = uploadResult.fileSize;
        finalData.mimeType = uploadResult.mimeType;
        if (data.estimatedDuration) {
          finalData.duration = data.estimatedDuration * 60; // Convert minutes to seconds
        }
      }
      
      setUploadProgress(90);
      await createContentItemMutation.mutateAsync(finalData);
      setUploadProgress(100);
    } catch (error) {
      console.error('Error creating content item:', error);
    }
  };
  
  const isLoading = createContentItemMutation.isPending || uploadFileMutation.isPending;
  const canProceed = () => {
    if (activeTab === 'type') return watchedType;
    if (activeTab === 'content') {
      if (watchedType === 'TEXT') return form.getValues('textContent');
      if (watchedType === 'URL') return form.getValues('url');
      if (watchedType === 'VIDEO' || watchedType === 'DOCUMENT') return selectedFile;
    }
    return true;
  };
  
  return (
    <MentorContentErrorBoundary context="upload">
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Content Item</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add learning materials to your section
          </p>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="type">Content Type</TabsTrigger>
            <TabsTrigger value="content" disabled={!watchedType}>
              Content Details
            </TabsTrigger>
            <TabsTrigger value="settings" disabled={!canProceed()}>
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="type" className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Select Content Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CONTENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = watchedType === type.value;
                  
                  return (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : type.color
                      }`}
                      onClick={() => {
                        form.setValue('type', type.value as any);
                        setSelectedFile(null);
                      }}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-blue-100' : 'bg-white'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{type.label}</h4>
                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                          </div>
                          <p className="text-sm text-gray-600">{type.description}</p>
                          {type.maxSize && (
                            <p className="text-xs text-gray-500 mt-1">
                              Max size: {type.maxSize}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-6">
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter content title"
                            {...field}
                          />
                        </FormControl>
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
                              placeholder="5"
                              className="pl-10"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
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
                          placeholder="Describe this content item"
                          rows={2}
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
                
                {/* Content Type Specific Fields */}
                {watchedType === 'TEXT' && (
                  <FormField
                    control={form.control}
                    name="textContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Content *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your text content here..."
                            rows={8}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Rich text formatting will be available after creation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {watchedType === 'URL' && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com or https://youtube.com/watch?v=..."
                            type="url"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Link to external content, YouTube videos, articles, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {(watchedType === 'VIDEO' || watchedType === 'DOCUMENT') && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Upload {selectedContentType?.label}</h4>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        {selectedFile ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <Check className="h-5 w-5" />
                              <span className="font-medium">File selected</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center gap-3">
                                {watchedType === 'VIDEO' ? (
                                  <Video className="h-8 w-8 text-gray-500" />
                                ) : (
                                  <FileText className="h-8 w-8 text-gray-500" />
                                )}
                                <div className="text-left">
                                  <div className="font-medium">{selectedFile.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedFile(null)}
                                  className="ml-auto"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('content-file-input')?.click()}
                            >
                              Choose Different File
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                            <div>
                              <p className="text-lg font-medium">Drop your {selectedContentType?.label.toLowerCase()} here</p>
                              <p className="text-gray-500">or click to browse</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('content-file-input')?.click()}
                            >
                              Select File
                            </Button>
                            <p className="text-xs text-gray-500">
                              Accepted formats: {selectedContentType?.acceptedFiles}
                              {selectedContentType?.maxSize && ` • Max size: ${selectedContentType.maxSize}`}
                            </p>
                          </div>
                        )}
                        
                        <input
                          id="content-file-input"
                          type="file"
                          className="hidden"
                          onChange={handleFileSelect}
                          accept={selectedContentType?.acceptedFiles || ''}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                          <FormDescription>
                            Order in the section (0 = first)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="isRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Required Content</FormLabel>
                              <FormDescription>
                                Students must complete this item
                              </FormDescription>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {(watchedType === 'VIDEO' || watchedType === 'DOCUMENT') && (
                        <FormField
                          control={form.control}
                          name="allowDownload"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Download</FormLabel>
                                <FormDescription>
                                  Let students download this file
                                </FormDescription>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Preview</CardTitle>
                    <CardDescription>
                      How this content item will appear to students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-white rounded">
                        {selectedContentType && (
                          <selectedContentType.icon className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {form.watch('title') || 'Untitled Content'}
                          </span>
                          {form.watch('isRequired') && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {form.watch('description') && (
                          <p className="text-sm text-gray-600 mt-1">
                            {form.watch('description')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          {form.watch('estimatedDuration') && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {form.watch('estimatedDuration')} min
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {selectedContentType?.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Upload Progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {activeTab !== 'type' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'settings') setActiveTab('content');
                  else if (activeTab === 'content') setActiveTab('type');
                }}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            
            {activeTab !== 'settings' ? (
              <Button
                onClick={() => {
                  if (activeTab === 'type') setActiveTab('content');
                  else if (activeTab === 'content') setActiveTab('settings');
                }}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading || !canProceed()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Content Item
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </MentorContentErrorBoundary>
  );
}