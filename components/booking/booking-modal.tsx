"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Video, MapPin, DollarSign, CheckCircle, X } from 'lucide-react';
import { TimeSlotSelectorV2 } from './time-slot-selector-v2';
import { BookingForm } from './booking-form';
import { BookingConfirmation } from './booking-confirmation';
import { useAuth } from '@/contexts/auth-context';
import { parseExpertise } from '@/lib/utils/safe-json';
import { toast } from 'sonner';

interface Mentor {
  id: string;
  userId: string;
  fullName?: string;
  title?: string;
  company?: string;
  profileImageUrl?: string;
  hourlyRate?: number;
  currency?: string;
  about?: string;
  expertise?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
}

type BookingStep = 'time-selection' | 'details' | 'confirmation' | 'success';

interface BookingData {
  scheduledAt: Date;
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  title: string;
  description?: string;
  location?: string;
}

export function BookingModal({ isOpen, onClose, mentor }: BookingModalProps) {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>('time-selection');
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string>();

  const handleClose = () => {
    setCurrentStep('time-selection');
    setBookingData({});
    setBookingId(undefined);
    onClose();
  };

  const handleTimeSelection = (scheduledAt: Date) => {
    setBookingData(prev => ({ ...prev, scheduledAt }));
    setCurrentStep('details');
  };

  const handleBookingDetails = (details: Omit<BookingData, 'scheduledAt'>) => {
    setBookingData(prev => ({ ...prev, ...details }));
    setCurrentStep('confirmation');
  };

  const handleConfirmBooking = async () => {
    if (!session) {
      toast.error('Please log in to book a session');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentorId: mentor.userId,
          title: bookingData.title,
          description: bookingData.description,
          scheduledAt: bookingData.scheduledAt?.toISOString(),
          duration: bookingData.duration,
          meetingType: bookingData.meetingType,
          location: bookingData.location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book session');
      }

      setBookingId(data.booking.id);
      setCurrentStep('success');
      toast.success('Session booked successfully!');

    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to book session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackStep = () => {
    switch (currentStep) {
      case 'details':
        setCurrentStep('time-selection');
        break;
      case 'confirmation':
        setCurrentStep('details');
        break;
      default:
        handleClose();
    }
  };

  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (!amount) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'time-selection':
        return 'Select Time';
      case 'details':
        return 'Session Details';
      case 'confirmation':
        return 'Confirm Booking';
      case 'success':
        return 'Booking Confirmed!';
      default:
        return 'Book Session';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  {getStepTitle()}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Book a mentoring session with {mentor.fullName}
                </DialogDescription>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center space-x-2 mt-4">
              {['time-selection', 'details', 'confirmation', 'success'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      currentStep === step
                        ? 'bg-blue-500 text-white'
                        : index < ['time-selection', 'details', 'confirmation', 'success'].indexOf(currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {index < ['time-selection', 'details', 'confirmation', 'success'].indexOf(currentStep) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 ${
                      index < ['time-selection', 'details', 'confirmation', 'success'].indexOf(currentStep)
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Left Side - Mentor Info */}
              <div className="lg:col-span-1 p-6 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-800">
                <div className="sticky top-0">
                  {/* Mentor Profile */}
                  <div className="text-center mb-6">
                    <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-white dark:ring-gray-800 shadow-lg">
                      <AvatarImage src={mentor.profileImageUrl} />
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {mentor.fullName?.charAt(0) || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {mentor.fullName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {mentor.title} {mentor.company && `at ${mentor.company}`}
                    </p>
                  </div>

                  <Separator className="mb-6" />

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Hourly Rate
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-sm font-semibold">
                        {formatCurrency(mentor.hourlyRate, mentor.currency)}
                      </Badge>
                    </div>
                  </div>

                  {/* Expertise */}
                  {mentor.expertise && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Expertise
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {parseExpertise(mentor.expertise).slice(0, 4).map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* About */}
                  {mentor.about && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        About
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {mentor.about.length > 150 
                          ? `${mentor.about.substring(0, 150)}...` 
                          : mentor.about
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Booking Steps */}
              <div className="lg:col-span-2 flex flex-col overflow-hidden">
                {currentStep === 'time-selection' && (
                  <div className="p-6 overflow-y-auto">
                    <TimeSlotSelectorV2
                      mentorId={mentor.userId}
                      onTimeSelected={handleTimeSelection}
                      initialSelectedTime={bookingData.scheduledAt}
                    />
                  </div>
                )}

                {currentStep === 'details' && bookingData.scheduledAt && (
                  <div className="h-[calc(90vh-200px)]">
                    <BookingForm
                      scheduledAt={bookingData.scheduledAt}
                      mentor={mentor}
                      onSubmit={handleBookingDetails}
                      onBack={handleBackStep}
                      initialData={bookingData}
                    />
                  </div>
                )}

                {currentStep === 'confirmation' && (
                  <div className="p-6 overflow-y-auto">
                    <BookingConfirmation
                      bookingData={bookingData as BookingData}
                      mentor={mentor}
                      onConfirm={handleConfirmBooking}
                      onBack={handleBackStep}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                )}

                {currentStep === 'success' && bookingId && (
                  <div className="p-6 text-center py-12">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Session Booked Successfully!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      You'll receive a confirmation email shortly with meeting details.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button onClick={handleClose} variant="outline">
                        Close
                      </Button>
                      <Button onClick={() => window.location.href = '/dashboard?section=sessions'}>
                        View My Sessions
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}