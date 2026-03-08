"use client"

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Video, MessageSquare, Headphones, User, CreditCard, ArrowLeft, MapPin, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentForm } from './PaymentForm';
import { motion } from 'framer-motion';

interface Mentor {
  id: string;
  userId: string;
  fullName?: string;
  title?: string;
  company?: string;
  hourlyRate?: number;
  currency?: string;
}

interface BookingData {
  scheduledAt: Date;
  sessionType: 'FREE' | 'PAID' | 'COUNSELING';
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  title: string;
  description?: string;
  location?: string;
}

interface BookingConfirmationProps {
  bookingData: BookingData;
  mentor: Mentor;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  bookingSource?: 'ai' | 'explore' | 'default';
  aiSpecialRate?: number | null;
}

const MEETING_TYPE_ICONS = {
  video: Video,
  audio: Headphones,
  chat: MessageSquare,
};

const MEETING_TYPE_LABELS = {
  video: 'Video Call',
  audio: 'Audio Call',
  chat: 'Text Chat',
};

const SESSION_TYPE_LABELS: Record<BookingData['sessionType'], string> = {
  FREE: 'Free Intro Session',
  PAID: 'Paid Session',
  COUNSELING: 'Counseling Session',
};

export function BookingConfirmation({ 
  bookingData, 
  mentor, 
  onConfirm, 
  onBack, 
  isSubmitting,
  bookingSource = 'default',
  aiSpecialRate = null,
}: BookingConfirmationProps) {
  const mentorHourlyRateValue = mentor.hourlyRate ? Number(mentor.hourlyRate) : 0;
  const sessionHours = bookingData.duration / 60;
  const basePrice = mentorHourlyRateValue * sessionHours;
  const hasAiPlanPricing =
    bookingSource === 'ai' &&
    bookingData.sessionType === 'PAID' &&
    typeof aiSpecialRate === 'number' &&
    aiSpecialRate > 0;
  const planTotal = hasAiPlanPricing ? aiSpecialRate * sessionHours : null;
  const displayTotal = planTotal !== null ? planTotal : basePrice;
  const savings = planTotal !== null ? Math.max(0, basePrice - planTotal) : 0;

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const MeetingIcon = MEETING_TYPE_ICONS[bookingData.meetingType];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center mb-6"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Review & Confirm
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You are just one step away from your session.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Main Ticket Card */}
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-lg">
          {/* Header Strip */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
             <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
             </div>
             <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                {bookingData.title}
             </h4>
             <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {bookingData.duration} minutes
             </p>
          </div>

          <CardContent className="p-0">
             <div className="p-6 space-y-6">
                
                {/* Time & Type Grid */}
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                         {format(bookingData.scheduledAt, 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                         {format(bookingData.scheduledAt, 'h:mm a')}
                      </p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Format</span>
                      <div className="flex items-center gap-2">
                         <MeetingIcon className="w-4 h-4 text-gray-500" />
                         <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {MEETING_TYPE_LABELS[bookingData.meetingType]}
                         </p>
                      </div>
                      {bookingData.meetingType === 'in_person' && bookingData.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                           <MapPin className="w-3 h-3" /> {bookingData.location}
                        </p>
                      )}
                   </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Session Type</span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {SESSION_TYPE_LABELS[bookingData.sessionType]}
                  </p>
                  {bookingData.sessionType === 'FREE' && (
                    <p className="text-xs text-gray-500">Free sessions are limited to 30 minutes.</p>
                  )}
                  {bookingData.sessionType === 'PAID' && (
                    <p className="text-xs text-gray-500">Paid sessions are limited to 45 minutes.</p>
                  )}
                </div>

                <Separator />

                {/* Mentor Info */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                         {mentor.fullName?.charAt(0) || 'M'}
                      </div>
                      <div>
                         <p className="text-sm font-medium text-gray-900 dark:text-white">{mentor.fullName}</p>
                         <p className="text-xs text-gray-500">{mentor.title}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rate</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                         {mentor.hourlyRate ? formatCurrency(mentor.hourlyRate, mentor.currency) + '/hr' : 'Free'}
                      </p>
                   </div>
                </div>

                {/* Pricing Breakdown (Only if paid) */}
                {mentor.hourlyRate && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Session Cost</span>
                       <div className="text-right">
                         <span className={`font-medium ${hasAiPlanPricing ? 'line-through text-slate-400' : 'text-gray-900 dark:text-white'}`}>
                           {formatCurrency(basePrice, mentor.currency)}
                         </span>
                         {hasAiPlanPricing && (
                           <p className="text-[10px] text-slate-500">Mentor listed rate</p>
                         )}
                       </div>
                    </div>
                    {hasAiPlanPricing && planTotal !== null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">AI plan rate</span>
                        <span className="text-blue-600 font-medium">
                          {formatCurrency(planTotal, mentor.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Service Fee</span>
                       <span className="text-gray-900 dark:text-white font-medium">$0.00</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-gray-900 dark:text-white">Total</span>
                       <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(displayTotal, mentor.currency)}</span>
                    </div>
                    {hasAiPlanPricing && savings > 0 && (
                      <p className="text-xs text-green-600 font-semibold">
                        You save {formatCurrency(savings, mentor.currency)} with your plan rate
                      </p>
                    )}
                  </div>
                )}
             </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Form Injection */}
      {bookingData.sessionType !== 'FREE' && (
        <motion.div 
           initial={{ opacity: 0 }} 
           animate={{ opacity: 1 }} 
           transition={{ delay: 0.2 }}
           className="pt-2"
        >
           <PaymentForm />
        </motion.div>
      )}

      {/* Warning / Notes */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 flex gap-3">
         <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
         <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Cancellation Policy</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed">
               You can reschedule or cancel for free up to 24 hours before the session. Late cancellations may be subject to a fee.
            </p>
         </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-500 hover:text-gray-900"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button 
          onClick={onConfirm} 
          disabled={isSubmitting}
          className="px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            <span>Confirm Booking</span>
          )}
        </Button>
      </div>
    </div>
  );
}
