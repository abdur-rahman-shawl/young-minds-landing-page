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

interface BookingAvailability {
  freeAvailable: boolean;
  paidAvailable: boolean;
  freeRemaining?: number | null;
  paidRemaining?: number | null;
  mentorSessionsRemaining?: number | null;
}

interface BookingFormProps {
  scheduledAt: Date;
  mentor: Mentor;
  availability?: BookingAvailability;
  freeDisabledReason?: string;
  hideFreeOption?: boolean;
  hideSessionTypeSelector?: boolean;
  onSubmit: (data: {
    sessionType: 'FREE' | 'PAID' | 'COUNSELING';
    duration: number;
    meetingType: 'video' | 'audio' | 'chat';
    title: string;
    description?: string;
    location?: string;
  }) => void;
  onBack: () => void;
  initialData?: Partial<{
    sessionType: 'FREE' | 'PAID' | 'COUNSELING';
    duration: number;
    meetingType: 'video' | 'audio' | 'chat';
    title: string;
    description?: string;
    location?: string;
  }>;
  bookingSource?: 'ai' | 'explore' | 'default';
  aiSpecialRate?: number | null;
}

const MEETING_TYPES = [
  { value: 'video', label: 'Video Call', icon: Video, description: 'Google Meet / Zoom' },
  { value: 'audio', label: 'Audio Call', icon: Headphones, description: 'Voice-only discussion' },
  { value: 'chat', label: 'Text Chat', icon: MessageSquare, description: 'Real-time messaging' },
] as const;

const DURATION_OPTIONS = [
  { value: 30, label: '30 min', price: 0.5 },
  { value: 45, label: '45 min', price: 0.75 },
  { value: 60, label: '60 min', price: 1 },
  { value: 90, label: '90 min', price: 1.5 },
  { value: 120, label: '2 hours', price: 2 },
];

export function BookingForm({
  scheduledAt,
  mentor,
  availability,
  freeDisabledReason,
  hideFreeOption,
  hideSessionTypeSelector,
  onSubmit,
  onBack,
  initialData,
  bookingSource = 'default',
  aiSpecialRate = null,
}: BookingFormProps) {
  const shouldHideSessionTypeSelector = Boolean(hideSessionTypeSelector);
  const freeAvailable = availability?.freeAvailable ?? true;
  const paidAvailable = availability?.paidAvailable ?? true;
  const hasAnyAvailability = freeAvailable || paidAvailable;
  const showFreeOption = !hideFreeOption;
  const freeRemaining = availability?.freeRemaining ?? null;
  const paidRemaining = availability?.paidRemaining ?? null;
  const mentorRemaining = availability?.mentorSessionsRemaining ?? null;

  const initialSessionType = initialData?.sessionType
    || (freeAvailable ? 'FREE' : paidAvailable ? 'PAID' : 'PAID');

  const [formData, setFormData] = useState({
    sessionType: initialSessionType as 'FREE' | 'PAID' | 'COUNSELING',
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

  const handleSessionTypeChange = (value: 'FREE' | 'PAID' | 'COUNSELING') => {
    if (value === 'FREE' && !freeAvailable) return;
    if (value === 'PAID' && !paidAvailable) return;

    setFormData(prev => {
      if (value === 'FREE') {
        return { ...prev, sessionType: value, duration: 30 };
      }

      const allowedPaidDurations = [30, 45];
      const nextDuration = allowedPaidDurations.includes(prev.duration) ? prev.duration : 45;
      return { ...prev, sessionType: value, duration: nextDuration };
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const mentorHourlyRateValue = mentor.hourlyRate ? Number(mentor.hourlyRate) : 0;
  const sessionHours = formData.duration / 60;
  const basePrice = mentorHourlyRateValue * sessionHours;
  const hasAiPlanPricing =
    bookingSource === 'ai' &&
    formData.sessionType === 'PAID' &&
    typeof aiSpecialRate === 'number' &&
    aiSpecialRate > 0;
  const planTotal = hasAiPlanPricing ? aiSpecialRate * sessionHours : null;
  const displayPrice = planTotal !== null ? planTotal : basePrice;
  const savings = planTotal !== null ? Math.max(0, basePrice - planTotal) : 0;

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
          
          {/* Session Type Selector */}
          {!shouldHideSessionTypeSelector && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    value: 'FREE',
                    label: 'Free Intro Session',
                    helper: freeAvailable
                      ? 'One-time, 30 minutes max'
                      : freeDisabledReason || 'Not available for this mentor',
                    disabled: !freeAvailable,
                  },
                  {
                    value: 'PAID',
                    label: 'Paid Session',
                    helper: paidAvailable ? 'Paid sessions up to 45 minutes' : 'Not available for this mentor',
                    disabled: !paidAvailable,
                  },
                ].filter((option) => (option.value === 'FREE' ? showFreeOption : true)).map((option) => {
                  const isSelected = formData.sessionType === option.value;
                  return (
                    <div
                      key={option.value}
                      onClick={() => handleSessionTypeChange(option.value as 'FREE' | 'PAID')}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 group",
                        option.disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40"
                          : "cursor-pointer hover:border-blue-300 dark:hover:border-blue-700",
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500"
                          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                      )}
                    >
                      <p className={cn("font-semibold text-sm", isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100")}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500">{option.helper}</p>
                      {option.value === 'FREE' && freeRemaining !== null && (
                        <p className="text-[10px] text-slate-400">Remaining: {freeRemaining}</p>
                      )}
                      {option.value === 'PAID' && (
                        <>
                          {mentorRemaining !== null && (
                            <p className="text-[10px] text-slate-400">
                              Mentor sessions left: {mentorRemaining}
                            </p>
                          )}
                          {paidRemaining !== null && (
                            <p className="text-[10px] text-slate-400">
                              Paid quotas left: {paidRemaining}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {!hasAnyAvailability && (
                <p className="text-xs text-red-500">
                  This mentor has no available free or paid sessions right now.
                </p>
              )}
            </div>
          )}

          {/* Duration Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Duration</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DURATION_OPTIONS.filter((option) => {
                if (formData.sessionType === 'FREE') return option.value === 30;
                if (formData.sessionType === 'PAID') return option.value <= 45;
                return true;
              }).map((option) => {
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
                  <p className="text-xs text-slate-500">
                    {formData.duration} mins @ {formatCurrency(mentorHourlyRateValue, mentor.currency)}/hr
                  </p>
               </div>
               <div className="flex flex-col items-end gap-1 text-right">
                  {planTotal !== null && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrency(basePrice, mentor.currency)}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(displayPrice, mentor.currency)}
                  </span>
                  {planTotal !== null && (
                    <span className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                      Your plan rate
                    </span>
                  )}
                  {planTotal !== null && savings > 0 && (
                    <span className="text-xs text-green-600 font-semibold">
                      Save {formatCurrency(savings, mentor.currency)} with AI booking
                    </span>
                  )}
               </div>
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
          disabled={!hasAnyAvailability}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
