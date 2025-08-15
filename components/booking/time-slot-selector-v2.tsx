"use client"

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Globe } from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  isPast,
  parseISO
} from 'date-fns';
import { toast } from 'sonner';

interface TimeSlotSelectorProps {
  mentorId: string;
  onTimeSelected: (selectedTime: Date) => void;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
}

export function TimeSlotSelectorV2({ mentorId, onTimeSelected }: TimeSlotSelectorProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [mentorTimezone, setMentorTimezone] = useState<string>('UTC');
  const [sessionDuration, setSessionDuration] = useState<number>(60);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Memoize week calculations
  const { weekStart, weekEnd, weekDays } = useMemo(() => {
    const start = currentWeek;
    const end = endOfWeek(start, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return { weekStart: start, weekEnd: end, weekDays: days };
  }, [currentWeek]);

  // Fetch available slots from the new API
  const fetchAvailableSlots = useCallback(async (date: Date) => {
    if (!mentorId || !date) return;

    setLoading(true);
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone: userTimezone
      });

      const response = await fetch(`/api/mentors/${mentorId}/availability/slots?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableSlots(data.slots || []);
        setMentorTimezone(data.mentorTimezone || 'UTC');
        setSessionDuration(data.sessionDuration || 60);
        
        if (data.slots.length === 0 && isSameDay(date, selectedDate || new Date())) {
          toast.info('No available slots for this date');
        }
      } else {
        console.error('Failed to fetch slots:', data.error);
        setAvailableSlots([]);
        
        if (data.message) {
          toast.error(data.message);
        }
      }
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([]);
      toast.error('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  }, [mentorId, userTimezone, selectedDate]);

  // Handle date selection
  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(undefined);
    fetchAvailableSlots(date);
  };

  // Handle time slot selection
  const handleTimeSlotSelection = (slot: AvailableSlot) => {
    if (!slot.available) {
      toast.error(slot.reason || 'This slot is not available');
      return;
    }

    const slotTime = parseISO(slot.startTime);
    setSelectedTimeSlot(slotTime);
  };

  // Confirm selection
  const confirmSelection = () => {
    if (selectedTimeSlot) {
      onTimeSelected(selectedTimeSlot);
    }
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(currentWeek, direction === 'next' ? 7 : -7);
    setCurrentWeek(newWeek);
    setSelectedDate(undefined);
    setSelectedTimeSlot(undefined);
    setAvailableSlots([]);
  };

  // Get slots for a specific date (for preview)
  const getSlotsCountForDate = (date: Date): number => {
    // This would need to be fetched from the API for accurate counts
    // For now, return 0 for past dates and weekends
    if (isPast(date) && !isToday(date)) return 0;
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0; // Weekend
    return 8; // Default estimate
  };

  // Group slots by hour for better display
  const groupedSlots = useMemo(() => {
    const groups: { [key: string]: AvailableSlot[] } = {};
    
    availableSlots.forEach(slot => {
      const hour = format(parseISO(slot.startTime), 'ha');
      if (!groups[hour]) {
        groups[hour] = [];
      }
      groups[hour].push(slot);
    });
    
    return groups;
  }, [availableSlots]);

  // Auto-select today if it's in the current week
  useEffect(() => {
    const today = new Date();
    if (weekDays.some(day => isSameDay(day, today))) {
      handleDateSelection(today);
    }
  }, []); // Only run on mount

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date & Time
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of the Week */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isPastDay = isPast(day) && !isCurrentDay;
              const slotsCount = getSlotsCountForDate(day);
              
              return (
                <Button
                  key={index}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`h-auto flex-col py-3 ${
                    isPastDay ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => !isPastDay && handleDateSelection(day)}
                  disabled={isPastDay}
                >
                  <span className="text-xs font-medium">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-lg font-semibold">
                    {format(day, 'd')}
                  </span>
                  {!isPastDay && slotsCount > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {slotsCount} slots
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Timezone Info */}
          {selectedDate && mentorTimezone !== userTimezone && (
            <Alert className="mt-4">
              <Globe className="h-4 w-4" />
              <AlertDescription>
                Times are shown in your timezone ({userTimezone}). 
                The mentor's timezone is {mentorTimezone}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Times for {format(selectedDate, 'EEEE, MMMM d')}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Session duration: {sessionDuration} minutes
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No available time slots for this date
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Please select another date
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSlots).map(([hour, slots]) => (
                  <div key={hour}>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {hour}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {slots.map((slot, index) => {
                        const slotTime = parseISO(slot.startTime);
                        const isSelected = selectedTimeSlot && isSameDay(slotTime, selectedTimeSlot) && 
                                         slotTime.getTime() === selectedTimeSlot.getTime();
                        
                        return (
                          <Button
                            key={index}
                            variant={isSelected ? 'default' : slot.available ? 'outline' : 'ghost'}
                            size="sm"
                            className={`${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => handleTimeSlotSelection(slot)}
                            disabled={!slot.available}
                          >
                            {format(slotTime, 'h:mm a')}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Selection */}
      {selectedTimeSlot && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selected Time
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(selectedTimeSlot, 'EEEE, MMMM d, yyyy')} at {format(selectedTimeSlot, 'h:mm a')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Duration: {sessionDuration} minutes
                </p>
              </div>
              <Button onClick={confirmSelection} size="lg">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}