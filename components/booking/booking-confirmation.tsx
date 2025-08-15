"use client"

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Video, MessageSquare, Headphones, User, CreditCard, ArrowLeft } from 'lucide-react';
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

interface BookingData {
  scheduledAt: Date;
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

export function BookingConfirmation({ 
  bookingData, 
  mentor, 
  onConfirm, 
  onBack, 
  isSubmitting 
}: BookingConfirmationProps) {
  const calculatePrice = () => {
    const hourlyRate = mentor.hourlyRate || 0;
    const hours = bookingData.duration / 60;
    return hourlyRate * hours;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const MeetingIcon = MEETING_TYPE_ICONS[bookingData.meetingType];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Review Your Booking
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please review the details below and confirm your session booking.
        </p>
      </div>

      {/* Session Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white text-lg">
              {bookingData.title}
            </h4>
            {bookingData.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {bookingData.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Date</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {format(bookingData.scheduledAt, 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {format(bookingData.scheduledAt, 'h:mm a')} ({bookingData.duration} min)
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Meeting Type */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <MeetingIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Meeting Type</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {MEETING_TYPE_LABELS[bookingData.meetingType]}
                {bookingData.meetingType === 'in_person' && bookingData.location && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    📍 {bookingData.location}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mentor Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Mentor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
              {mentor.fullName?.charAt(0) || 'M'}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {mentor.fullName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {mentor.title} {mentor.company && `at ${mentor.company}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Card */}
      {mentor.hourlyRate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Session ({bookingData.duration} minutes)
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(calculatePrice(), mentor.currency)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Rate per hour
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatCurrency(mentor.hourlyRate, mentor.currency)}
              </span>
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">
                Total
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(calculatePrice(), mentor.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notes */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Important Notes
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• You'll receive a confirmation email with meeting details</li>
                <li>• The mentor will be notified about your booking request</li>
                {bookingData.meetingType === 'video' && (
                  <li>• A video meeting link will be provided before the session</li>
                )}
                <li>• You can reschedule or cancel up to 24 hours before the session</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center space-x-2"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <Button 
          onClick={onConfirm} 
          disabled={isSubmitting}
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  );
}