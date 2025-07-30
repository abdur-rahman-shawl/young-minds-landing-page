"use client";

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book, FileText, Link, Upload, X, Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useCreateContent, useUploadFile } from '@/hooks/queries/use-content-queries';
import { toast } from 'sonner';

// Validation schemas
const baseContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: z.enum(['COURSE', 'FILE', 'URL']),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

const fileContentSchema = baseContentSchema.extend({
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

const urlContentSchema = baseContentSchema.extend({
  url: z.string().url('Please enter a valid URL'),
  urlTitle: z.string().max(100, 'URL title must be less than 100 characters').optional(),
  urlDescription: z.string().max(200, 'URL description must be less than 200 characters').optional(),
});

type FormData = z.infer<typeof baseContentSchema> & {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  urlTitle?: string;
  urlDescription?: string;
};

interface CreateContentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
}

const CONTENT_TYPES = [
  {
    value: 'COURSE',
    label: 'Course',
    description: 'Structured learning with modules and lessons',
    icon: Book,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    value: 'FILE',
    label: 'File',
    description: 'Upload documents, videos, presentations',
    icon: FileText,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
  },
  {
    value: 'URL',
    label: 'URL',
    description: 'External links, YouTube videos, articles',
    icon: Link,
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
];

export function CreateContentDialog({ open = false, onOpenChange, onSuccess }: CreateContentDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const createContentMutation = useCreateContent();
  const uploadFileMutation = useUploadFile();
  
  // Dynamic schema resolver based on content type
  const getSchemaForType = (type: string) => {
    switch (type) {
      case 'URL':
        return urlContentSchema;
      case 'FILE':
        return fileContentSchema;
      default:
        return baseContentSchema;
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(baseContentSchema),
    defaultValues: {
      type: 'COURSE',
      status: 'DRAFT',
      url: '',
      urlTitle: '',
      urlDescription: '',
    },
  });
  
  const watchedType = form.watch('type');
  const totalSteps = watchedType === 'COURSE' ? 2 : watchedType === 'FILE' ? 3 : 3;
  
  // Update form resolver when type changes
  React.useEffect(() => {
    const schema = getSchemaForType(watchedType);
    form.clearErrors(); // Clear previous validation errors
  }, [watchedType, form]);
  
  const handleClose = useCallback(() => {
    onOpenChange?.(false);
    onSuccess();
  }, [onOpenChange, onSuccess]);
  
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
  
  const validateCurrentStep = () => {
    const values = form.getValues();
    console.log(`Validating step ${step} for type ${watchedType}:`, values);
    
    if (step === 1) {
      const isValid = values.title && values.type;
      console.log('Step 1 validation:', isValid);
      return isValid;
    }
    
    if (step === 2 && watchedType === 'FILE') {
      const isValid = selectedFile;
      console.log('Step 2 FILE validation:', isValid);
      return isValid;
    }
    
    if (step === 2 && watchedType === 'URL') {
      // Validate URL with schema
      try {
        if (!values.url) {
          console.log('Step 2 URL validation failed: no URL');
          return false;
        }
        z.string().url().parse(values.url);
        console.log('Step 2 URL validation passed');
        return true;
      } catch (error) {
        console.log('Step 2 URL validation failed:', error);
        return false;
      }
    }
    
    // Step 3 validation for URL type
    if (step === 3 && watchedType === 'URL') {
      // Ensure we have both title and valid URL for final submission
      try {
        if (!values.title || !values.url) {
          console.log('Step 3 URL validation failed: missing title or URL');
          return false;
        }
        z.string().url().parse(values.url);
        console.log('Step 3 URL validation passed');
        return true;
      } catch (error) {
        console.log('Step 3 URL validation failed:', error);
        return false;
      }
    }
    
    // Step 3 validation for FILE type
    if (step === 3 && watchedType === 'FILE') {
      const isValid = values.title && selectedFile;
      console.log('Step 3 FILE validation:', isValid);
      return isValid;
    }
    
    console.log('Default validation: true');
    return true;
  };
  
  const nextStep = () => {
    if (validateCurrentStep() && step < totalSteps) {
      setStep(step + 1);
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form submission started with data:', data);
      
      // Get current form values directly
      const currentFormValues = form.getValues();
      console.log('Form values from getValues():', currentFormValues);
      console.log('URL field specifically:', currentFormValues.url);
      
      // Use current form values instead of the data parameter
      const formData = { ...currentFormValues };
      console.log('Using form data:', formData);
      
      // Validate data based on content type
      let validatedData;
      
      if (formData.type === 'URL') {
        console.log('Validating URL data...');
        validatedData = urlContentSchema.parse(formData);
        console.log('URL validation passed:', validatedData);
      } else if (formData.type === 'FILE') {
        console.log('Validating FILE data...');
        validatedData = fileContentSchema.parse(formData);
      } else {
        console.log('Validating base data...');
        validatedData = baseContentSchema.parse(formData);
      }
      
      let finalData = { ...validatedData };
      
      // Handle file upload for FILE type
      if (formData.type === 'FILE' && selectedFile) {
        setUploadProgress(10);
        const uploadResult = await uploadFileMutation.mutateAsync({
          file: selectedFile,
          type: 'content',
        });
        setUploadProgress(70);
        
        finalData = {
          ...finalData,
          fileUrl: uploadResult.url,
          fileName: uploadResult.name,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        };
      }
      
      console.log('Submitting final data to API:', finalData);
      setUploadProgress(90);
      await createContentMutation.mutateAsync(finalData);
      setUploadProgress(100);
      
      toast.success('Content created successfully!');
      handleClose();
    } catch (error) {
      console.error('Form submission error:', error);
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        // Handle validation errors
        error.errors.forEach((err) => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        console.error('Error creating content:', error);
        toast.error('Failed to create content. Please try again.');
      }
      setUploadProgress(0);
    }
  };
  
  const isLoading = createContentMutation.isPending || uploadFileMutation.isPending;
  const isStepValid = validateCurrentStep();
  const isButtonDisabled = isLoading || !isStepValid;
  
  console.log('Button state:', {
    step,
    watchedType,
    isLoading,
    isStepValid,
    isButtonDisabled,
    totalSteps
  });
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Content Type</h3>
              <div className="grid grid-cols-1 gap-3">
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
                      onClick={() => form.setValue('type', type.value as any)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a descriptive title for your content"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be displayed to your mentees
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
                      placeholder="Describe what mentees will learn from this content"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help mentees understand the value of your content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 2:
        if (watchedType === 'FILE') {
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Upload File</h3>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                          <FileText className="h-8 w-8 text-gray-500" />
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
                        onClick={() => document.getElementById('file-input')?.click()}
                      >
                        Choose Different File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium">Drop your file here</p>
                        <p className="text-gray-500">or click to browse</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('file-input')?.click()}
                      >
                        Select File
                      </Button>
                      <p className="text-xs text-gray-500">
                        Supports: PDF, DOC, DOCX, PPT, PPTX, MP4, MOV, and more
                      </p>
                    </div>
                  )}
                  
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi,.jpg,.jpeg,.png,.webp,.txt"
                  />
                </div>
              </div>
            </div>
          );
        }
        
        if (watchedType === 'URL') {
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Add URL Details</h3>
              </div>
              
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
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          console.log('URL field changed:', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Link to external content, YouTube videos, articles, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="urlTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="How this link should appear to mentees"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use the main title
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="urlDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional context about this link"
                        rows={2}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        }
        
        return null;
        
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review & Publish</h3>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {CONTENT_TYPES.find(t => t.value === watchedType)?.icon && (
                    <div className="p-1 bg-blue-100 rounded">
                      {React.createElement(CONTENT_TYPES.find(t => t.value === watchedType)!.icon, {
                        className: "h-4 w-4 text-blue-600"
                      })}
                    </div>
                  )}
                  {form.getValues('title')}
                </CardTitle>
                <CardDescription>
                  {form.getValues('description') || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <Badge variant="secondary" className="ml-2">
                      {CONTENT_TYPES.find(t => t.value === watchedType)?.label}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant="outline" className="ml-2">
                      {form.getValues('status')}
                    </Badge>
                  </div>
                  
                  {watchedType === 'FILE' && selectedFile && (
                    <div className="col-span-2">
                      <span className="font-medium">File:</span>
                      <div className="mt-1 text-gray-600">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    </div>
                  )}
                  
                  {watchedType === 'URL' && form.getValues('url') && (
                    <div className="col-span-2">
                      <span className="font-medium">URL:</span>
                      <div className="mt-1 text-blue-600 break-all">
                        {form.getValues('url')}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publishing Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DRAFT">
                        <div>
                          <div className="font-medium">Save as Draft</div>
                          <div className="text-xs text-gray-500">Not visible to mentees</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="PUBLISHED">
                        <div>
                          <div className="font-medium">Publish Now</div>
                          <div className="text-xs text-gray-500">Immediately available to mentees</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-gray-500 text-center">
                  {uploadProgress < 70 ? 'Uploading file...' : 
                   uploadProgress < 90 ? 'Creating content...' : 'Finalizing...'}
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={(step / totalSteps) * 100} className="flex-1" />
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Step {step} of {totalSteps}
            </span>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}
            
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? handleClose : prevStep}
                disabled={isLoading}
              >
                {step === 1 ? 'Cancel' : (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </>
                )}
              </Button>
              
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateCurrentStep() || isLoading}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isButtonDisabled}
                  onClick={() => console.log('Create Content button clicked!')}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Content
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}