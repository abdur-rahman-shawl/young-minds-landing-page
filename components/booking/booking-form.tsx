"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Video, Headphones, MessageSquare, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Mentor {
  id: string;
  userId: string;
  fullName?: string;
  title?: string;
  company?: string;
  hourlyRate?: number;
  currency?: string;
}

interface BookingFormProps {
  scheduledAt: Date;
  mentor: Mentor;
  onSubmit: (data: {
    duration: number;
    meetingType: 'video' | 'audio' | 'chat';
    title: string;
    description?: string;
    location?: string;
  }) => void;
  onBack: () => void;
  initialData?: Partial<{
    duration: number;
    meetingType: 'video' | 'audio' | 'chat';
    title: string;
    description?: string;
    location?: string;
  }>;
}

const MEETING_TYPES = [
  { value: 'video', label: 'Video Call', icon: Video, description: 'Google Meet / Zoom' },
  { value: 'audio', label: 'Audio Call', icon: Headphones, description: 'Voice-only discussion' },
  { value: 'chat', label: 'Text Chat', icon: MessageSquare, description: 'Real-time messaging' },
] as const;

const DURATION_OPTIONS = [
  { value: 30, label: '30 min', price: 0.5 },
  { value: 60, label: '60 min', price: 1 },
  { value: 90, label: '90 min', price: 1.5 },
  { value: 120, label: '2 hours', price: 2 },
];

export function BookingForm({ scheduledAt, mentor, onSubmit, onBack, initialData }: BookingFormProps) {
  const [formData, setFormData] = useState({
    duration: initialData?.duration || 60,
    meetingType: initialData?.meetingType || 'video' as const,
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Please provide a topic for the session';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validateForm()) onSubmit(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const calculatePrice = () => {
    const hourlyRate = mentor.hourlyRate || 0;
    const hours = formData.duration / 60;
    return hourlyRate * hours;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scroll-smooth">
        
        {/* Selected Time Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 flex items-center gap-4">
           <div className="p-2 bg-white dark:bg-blue-900/50 rounded-md shadow-sm">
             <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
           </div>
           <div>
             <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold uppercase tracking-wider">Scheduled Time</p>
             <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                <span>{format(scheduledAt, 'EEEE, MMMM d, yyyy')}</span>
                <span className="w-1 h-1 bg-slate-400 rounded-full" />
                <span>{format(scheduledAt, 'h:mm a')}</span>
             </div>
           </div>
        </div>

        <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* Duration Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Duration</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DURATION_OPTIONS.map((option) => {
                const isSelected = formData.duration === option.value;
                return (
                  <div
                    key={option.value}
                    onClick={() => handleInputChange('duration', option.value)}
                    className={cn(
                      "cursor-pointer relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 text-center group hover:border-blue-300 dark:hover:border-blue-700",
                      isSelected 
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500" 
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                    )}
                  >
                    {isSelected && <div className="absolute top-2 right-2 text-blue-600 dark:text-blue-400"><CheckCircle2 className="w-3.5 h-3.5" /></div>}
                    <span className={cn("font-bold text-sm", isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300")}>
                      {option.label}
                    </span>
                    {mentor.hourlyRate && (
                      <span className="text-xs text-slate-500 font-medium">
                        {formatCurrency(mentor.hourlyRate * option.price, mentor.currency)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meeting Type Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">How do you want to meet?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MEETING_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.meetingType === type.value;
                return (
                  <div
                    key={type.value}
                    onClick={() => handleInputChange('meetingType', type.value)}
                    className={cn(
                      "cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 group hover:border-blue-300 dark:hover:border-blue-700",
                      isSelected 
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500" 
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className={cn("p-2 w-fit rounded-lg", isSelected ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn("font-semibold text-sm", isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100")}>{type.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text Inputs */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">
                Session Topic <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="What do you want to achieve?"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={cn(
                   "h-11 border-slate-200 focus:ring-blue-500/20 transition-all",
                   errors.title ? 'border-red-500 focus-visible:ring-red-200' : ''
                )}
              />
              {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Additional Details (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Share any background info or specific questions..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="resize-none border-slate-200 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Pricing Summary (Compact) */}
          {mentor.hourlyRate && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
               <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Total</p>
                  <p className="text-xs text-slate-500">{formData.duration} mins @ {formatCurrency(mentor.hourlyRate, mentor.currency)}/hr</p>
               </div>
               <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(calculatePrice(), mentor.currency)}
               </p>
            </div>
          )}

        </form>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button 
          type="submit"
          form="booking-form"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-lg shadow-blue-500/20"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}