"use client";

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Plus, Minus, Save, Loader2, DollarSign, Clock, Target, BookOpen, Tag, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useCreateCourse, useUploadFile, Course } from '@/hooks/queries/use-content-queries';
import { toast } from 'sonner';

const createCourseSchema = z.object({
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  price: z.string().optional(),
  currency: z.string().default('USD'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learningOutcomes: z.array(z.string()).min(1, 'At least one learning outcome is required'),
  // SEO fields
  seoTitle: z.string().max(60, 'SEO title must be less than 60 characters').optional(),
  seoDescription: z.string().max(160, 'SEO description must be less than 160 characters').optional(),
  // Advanced settings
  maxStudents: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  certificateTemplate: z.string().optional(),
});

type CourseFormData = z.infer<typeof createCourseSchema>;

interface CreateCourseDialogProps {
  contentId: string;
  existingCourse?: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIFFICULTY_OPTIONS = [
  {
    value: 'BEGINNER',
    label: 'Beginner',
    description: 'No prior experience needed',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    value: 'INTERMEDIATE',
    label: 'Intermediate',
    description: 'Some basic knowledge required',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    value: 'ADVANCED',
    label: 'Advanced',
    description: 'Extensive knowledge required',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
];

const POPULAR_CATEGORIES = [
  'Programming & Development',
  'Business & Entrepreneurship',
  'Design & Creative',
  'Marketing & Sales',
  'Data Science & Analytics',
  'Personal Development',
  'Language Learning',
  'Health & Wellness',
  'Finance & Accounting',
  'Project Management',
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
];

export function CreateCourseDialog({ contentId, existingCourse, open, onOpenChange }: CreateCourseDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [prerequisiteInput, setPrerequisiteInput] = useState('');
  const [outcomeInput, setOutcomeInput] = useState('');
  
  const createCourseMutation = useCreateCourse();
  const uploadFileMutation = useUploadFile();
  
  const form = useForm<CourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      difficulty: existingCourse?.difficulty || 'BEGINNER',
      duration: existingCourse?.duration || undefined,
      price: existingCourse?.price || '',
      currency: existingCourse?.currency || 'USD',
      category: existingCourse?.category || '',
      tags: existingCourse?.tags ? JSON.parse(existingCourse.tags) : [],
      prerequisites: existingCourse?.prerequisites ? JSON.parse(existingCourse.prerequisites) : [],
      learningOutcomes: existingCourse?.learningOutcomes ? JSON.parse(existingCourse.learningOutcomes) : [],
      isPublic: true,
      allowComments: true,
      seoTitle: '',
      seoDescription: '',
    },
  });
  
  const handleThumbnailChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedThumbnail(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  const addTag = useCallback(() => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags');
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  }, [tagInput, form]);
  
  const removeTag = useCallback((tag: string) => {
    const currentTags = form.getValues('tags');
    form.setValue('tags', currentTags.filter(t => t !== tag));
  }, [form]);
  
  const addPrerequisite = useCallback(() => {
    if (prerequisiteInput.trim()) {
      const currentPrereqs = form.getValues('prerequisites');
      if (!currentPrereqs.includes(prerequisiteInput.trim())) {
        form.setValue('prerequisites', [...currentPrereqs, prerequisiteInput.trim()]);
      }
      setPrerequisiteInput('');
    }
  }, [prerequisiteInput, form]);
  
  const removePrerequisite = useCallback((prereq: string) => {
    const currentPrereqs = form.getValues('prerequisites');
    form.setValue('prerequisites', currentPrereqs.filter(p => p !== prereq));
  }, [form]);
  
  const addOutcome = useCallback(() => {
    if (outcomeInput.trim()) {
      const currentOutcomes = form.getValues('learningOutcomes');
      if (!currentOutcomes.includes(outcomeInput.trim())) {
        form.setValue('learningOutcomes', [...currentOutcomes, outcomeInput.trim()]);
      }
      setOutcomeInput('');
    }
  }, [outcomeInput, form]);
  
  const removeOutcome = useCallback((outcome: string) => {
    const currentOutcomes = form.getValues('learningOutcomes');
    form.setValue('learningOutcomes', currentOutcomes.filter(o => o !== outcome));
  }, [form]);
  
  const onSubmit = async (data: CourseFormData) => {
    try {
      let thumbnailUrl = existingCourse?.thumbnailUrl;
      
      // Upload thumbnail if selected
      if (selectedThumbnail) {
        const uploadResult = await uploadFileMutation.mutateAsync({
          file: selectedThumbnail,
          type: 'thumbnail',
        });
        thumbnailUrl = uploadResult.fileUrl;
      }
      
      await createCourseMutation.mutateAsync({
        contentId,
        data: {
          ...data,
          thumbnailUrl,
        },
      });
      
      toast.success(existingCourse ? 'Course updated successfully!' : 'Course created successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };
  
  const isLoading = createCourseMutation.isPending || uploadFileMutation.isPending;
  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.value === form.watch('currency'));
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {existingCourse ? 'Edit Course Details' : 'Setup Course Details'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty Level *</FormLabel>
                          <div className="space-y-2">
                            {DIFFICULTY_OPTIONS.map((option) => {
                              const isSelected = field.value === option.value;
                              return (
                                <Card
                                  key={option.value}
                                  className={`cursor-pointer transition-all border ${
                                    isSelected
                                      ? 'ring-2 ring-blue-500 bg-blue-50'
                                      : option.color
                                  }`}
                                  onClick={() => field.onChange(option.value)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-xs text-gray-600">{option.description}</div>
                                      </div>
                                      {isSelected && (
                                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                          <div className="w-2 h-2 bg-white rounded-full" />
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {POPULAR_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Duration (minutes)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                type="number"
                                placeholder="120"
                                className="pl-10"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Total estimated time to complete the course
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Course Thumbnail</Label>
                      <div className="mt-2">
                        {thumbnailPreview || existingCourse?.thumbnailUrl ? (
                          <div className="relative">
                            <img
                              src={thumbnailPreview || existingCourse?.thumbnailUrl}
                              alt="Course thumbnail"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                              onClick={() => {
                                setSelectedThumbnail(null);
                                setThumbnailPreview(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">Upload thumbnail</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('thumbnail-input')?.click()}
                            >
                              Choose Image
                            </Button>
                            <p className="text-xs text-gray-500 mt-2">
                              Recommended: 1280x720px, JPG or PNG
                            </p>
                          </div>
                        )}
                        <input
                          id="thumbnail-input"
                          type="file"
                          className="hidden"
                          onChange={handleThumbnailChange}
                          accept="image/*"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {form.watch('tags').length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch('tags').map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              <Tag className="h-3 w-3" />
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="pricing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing Settings
                    </CardTitle>
                    <CardDescription>
                      Set your course pricing and currency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400">
                                  {selectedCurrency?.symbol || '$'}
                                </span>
                                <Input
                                  placeholder="29.99"
                                  className="pl-8"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Leave empty for free course
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CURRENCY_OPTIONS.map((currency) => (
                                  <SelectItem key={currency.value} value={currency.value}>
                                    {currency.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Pricing Tips</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Free courses get more initial traction</li>
                        <li>• Consider starting free and adding paid premium content</li>
                        <li>• Research competitor pricing in your category</li>
                        <li>• You can always adjust pricing later</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="content" className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <Label>Prerequisites</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add a prerequisite"
                        value={prerequisiteInput}
                        onChange={(e) => setPrerequisiteInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
                      />
                      <Button type="button" onClick={addPrerequisite} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.watch('prerequisites').length > 0 && (
                      <div className="space-y-2 mt-3">
                        {form.watch('prerequisites').map((prereq, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{prereq}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePrerequisite(prereq)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Learning Outcomes *</Label>
                    <p className="text-sm text-gray-600 mb-2">What will students achieve after completing this course?</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Students will be able to..."
                        value={outcomeInput}
                        onChange={(e) => setOutcomeInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                      />
                      <Button type="button" onClick={addOutcome} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.watch('learningOutcomes').length > 0 && (
                      <div className="space-y-2 mt-3">
                        {form.watch('learningOutcomes').map((outcome, index) => (
                          <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{outcome}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOutcome(outcome)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.formState.errors.learningOutcomes && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.learningOutcomes.message}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">SEO Settings</CardTitle>
                      <CardDescription>
                        Optimize your course for search engines
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="seoTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Optimized title for search engines"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {field.value?.length || 0}/60 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="seoDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Brief description for search results"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {field.value?.length || 0}/160 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Course Settings</CardTitle>
                      <CardDescription>
                        Configure advanced course options
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="maxStudents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Students</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  placeholder="Unlimited"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Leave empty for unlimited enrollment
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="isPublic"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Public Course</FormLabel>
                                <FormDescription>
                                  Allow anyone to discover this course
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="allowComments"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Comments</FormLabel>
                                <FormDescription>
                                  Let students comment on course content
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {existingCourse ? 'Update Course' : 'Create Course'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}