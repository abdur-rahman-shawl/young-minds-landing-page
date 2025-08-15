"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, Headphones, MessageSquare, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

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
}

const MEETING_TYPES = [
  { value: 'video', label: 'Video Call', icon: Video, description: 'Meet via video call (Google Meet, Zoom)' },
  { value: 'audio', label: 'Audio Call', icon: Headphones, description: 'Voice-only call' },
  { value: 'chat', label: 'Text Chat', icon: MessageSquare, description: 'Real-time messaging session' },
] as const;

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes', price: 0.5 },
  { value: 60, label: '1 hour', price: 1 },
  { value: 90, label: '1.5 hours', price: 1.5 },
  { value: 120, label: '2 hours', price: 2 },
];

export function BookingForm({ scheduledAt, mentor, onSubmit, onBack }: BookingFormProps) {
  const [formData, setFormData] = useState({
    duration: 60,
    meetingType: 'video' as const,
    title: '',
    description: '',
    location: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Session title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculatePrice = () => {
    const hourlyRate = mentor.hourlyRate || 0;
    const hours = formData.duration / 60;
    return hourlyRate * hours;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Scrollable Content Area */}
      <div className="overflow-y-auto max-h-[calc(100%-80px)] px-4 py-4 space-y-6">
        {/* Selected Time Display */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {format(scheduledAt, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {format(scheduledAt, 'h:mm a')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Session Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Session Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Career guidance session, Technical interview prep"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Session Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Session Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what you'd like to discuss or any specific topics you want to cover..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Duration *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DURATION_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={formData.duration === option.value ? "default" : "outline"}
                  className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                    formData.duration === option.value
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'hover:bg-blue-50 dark:hover:bg-blue-950/20'
                  }`}
                  onClick={() => handleInputChange('duration', option.value)}
                >
                  <span className="font-medium">{option.label}</span>
                  {mentor.hourlyRate && (
                    <span className="text-xs opacity-80">
                      {formatCurrency(mentor.hourlyRate * option.price, mentor.currency)}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Meeting Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Meeting Type *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MEETING_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  type="button"
                  variant={formData.meetingType === type.value ? "default" : "outline"}
                  className={`h-auto p-4 flex items-start space-x-3 text-left ${
                    formData.meetingType === type.value
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'hover:bg-blue-50 dark:hover:bg-blue-950/20'
                  }`}
                  onClick={() => handleInputChange('meetingType', type.value)}
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs opacity-80 mt-1">
                      {type.description}
                    </div>
                  </div>
                </Button>
                );
              })}
            </div>
          </div>

          {/* Pricing Summary */}
          {mentor.hourlyRate && (
          <Card className="bg-gray-50 dark:bg-gray-900/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Cost
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {formData.duration} minutes • {formatCurrency(mentor.hourlyRate, mentor.currency)}/hour
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(calculatePrice(), mentor.currency)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        </form>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 min-h-[80px]">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <Button 
          type="submit"
          form="booking-form"
          className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}