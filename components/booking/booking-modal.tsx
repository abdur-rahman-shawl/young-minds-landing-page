"use client"

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { DollarSign, CheckCircle, X, ChevronRight, Star } from 'lucide-react';
import { TimeSlotSelectorV2 } from './time-slot-selector-v2';
import { BookingForm } from './booking-form';
import { BookingConfirmation } from './booking-confirmation';
import { useAuth } from '@/contexts/auth-context';
import { parseExpertise } from '@/lib/utils/safe-json';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  // Steps definition for UI mapping
  const STEPS = [
    { id: 'time-selection', label: 'Time' },
    { id: 'details', label: 'Details' },
    { id: 'confirmation', label: 'Confirm' }
  ];

  const resetState = () => {
    // Small timeout to allow modal close animation to start before resetting state
    setTimeout(() => {
      setCurrentStep('time-selection');
      setBookingData({});
      setBookingId(undefined);
    }, 300);
    onClose();
  };

  const handleAttemptClose = () => {
    if (currentStep === 'time-selection' && !bookingData.scheduledAt) {
      resetState();
    } else if (currentStep === 'success') {
      resetState();
    } else {
      setIsCloseConfirmOpen(true);
    }
  };

  const handleConfirmClose = () => {
    setIsCloseConfirmOpen(false);
    resetState();
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
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok) throw new Error(data.error || 'Failed to book session');

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
    if (currentStep === 'details') setCurrentStep('time-selection');
    else if (currentStep === 'confirmation') setCurrentStep('details');
    else handleAttemptClose();
  };

  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (!amount) return 'Free';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent
          // Added [&>button]:hidden to hide the default shadcn close button
          className="max-w-5xl h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden border-0 shadow-large rounded-2xl [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex h-full">

            {/* LEFT SIDEBAR: Mentor Context */}
            <div className="w-80 hidden lg:flex flex-col bg-secondary dark:bg-card border-r border-border h-full">
              <div className="p-8 flex flex-col h-full">

                {/* Avatar & Basic Info */}
                <div className="text-center mb-6">
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <Avatar className="w-full h-full border-4 border-background shadow-md">
                      <AvatarImage src={mentor.profileImageUrl} />
                      <AvatarFallback className="text-2xl bg-indigo-500 text-white">
                        {mentor.fullName?.charAt(0) || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Rating Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-background py-1 px-2 rounded-full shadow-subtle border border-border flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-foreground">5.0</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-foreground leading-tight">
                    {mentor.fullName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mentor.title} {mentor.company && `at ${mentor.company}`}
                  </p>
                </div>

                <Separator className="mb-6 bg-border" />

                {/* Hourly Rate */}
                <div className="bg-card p-4 rounded-xl border border-border mb-6 shadow-subtle">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Session Rate</p>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-foreground">{formatCurrency(mentor.hourlyRate, mentor.currency)}</span>
                    <span className="text-sm text-muted-foreground mb-1">/ hour</span>
                  </div>
                </div>

                {/* Expertise Tags */}
                {mentor.expertise && (
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Core Expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {parseExpertise(mentor.expertise).slice(0, 5).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-card hover:bg-card border border-border text-muted-foreground font-normal">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-6 text-xs text-center text-muted-foreground">
                  Powered by <span className="font-semibold text-foreground">SharingMinds</span>
                </div>
              </div>
            </div>

            {/* RIGHT CONTENT: Wizard Steps */}
            <div className="flex-1 flex flex-col min-w-0 bg-background relative">

              {/* Custom Close Button */}
              <button
                onClick={handleAttemptClose}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10 rounded-full hover:bg-muted"
                aria-label="Close booking modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Step Indicator */}
              {currentStep !== 'success' && (
                <div className="px-8 pt-8 pb-4">
                  <div className="flex items-center justify-between max-w-md mx-auto relative">
                    {/* Background Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10" />

                    {STEPS.map((step, idx) => {
                      const isActive = step.id === currentStep;
                      const isCompleted = STEPS.findIndex(s => s.id === currentStep) > idx;

                      return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300",
                            isActive ? "border-primary bg-primary text-primary-foreground scale-110" :
                              isCompleted ? "border-primary bg-background text-primary" :
                                "border-border text-muted-foreground bg-background"
                          )}>
                            {isCompleted ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                          </div>
                          <span className={cn(
                            "text-xs font-medium transition-colors duration-300",
                            isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step Content Area */}
              <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait" initial={false}>

                  {currentStep === 'time-selection' && (
                    <motion.div
                      key="step-time"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <div className="h-full px-4 md:px-8 py-4 overflow-y-auto">
                        <h2 className="text-2xl font-bold text-foreground text-center mb-6">Select a Date & Time</h2>
                        <TimeSlotSelectorV2
                          mentorId={mentor.userId}
                          onTimeSelected={handleTimeSelection}
                          initialSelectedTime={bookingData.scheduledAt}
                        />
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'details' && bookingData.scheduledAt && (
                    <motion.div
                      key="step-details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <BookingForm
                        scheduledAt={bookingData.scheduledAt}
                        mentor={mentor}
                        onSubmit={handleBookingDetails}
                        onBack={handleBackStep}
                        initialData={bookingData}
                      />
                    </motion.div>
                  )}

                  {currentStep === 'confirmation' && (
                    <motion.div
                      key="step-confirm"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full overflow-y-auto p-8"
                    >
                      <BookingConfirmation
                        bookingData={bookingData as BookingData}
                        mentor={mentor}
                        onConfirm={handleConfirmBooking}
                        onBack={handleBackStep}
                        isSubmitting={isSubmitting}
                      />
                    </motion.div>
                  )}

                  {currentStep === 'success' && bookingId && (
                    <motion.div
                      key="step-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
                      </div>
                      <h2 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
                      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
                        Your session has been scheduled. Check your email for the calendar invite and meeting link.
                      </p>
                      <div className="flex gap-4">
                        <Button variant="outline" onClick={resetState} size="lg">Close</Button>
                        <Button onClick={() => window.location.href = '/dashboard?section=sessions'} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          View My Sessions
                        </Button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              You are in the middle of booking a session. If you leave now, your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsCloseConfirmOpen(false)}>Continue Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} className="bg-red-600 hover:bg-red-700 text-white">Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}