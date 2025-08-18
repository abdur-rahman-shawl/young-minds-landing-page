"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isAfter, isBefore, addMinutes, isToday, getDay } from 'date-fns';

interface TimeSlotSelectorProps {
  mentorId: string;
  onTimeSelected: (selectedTime: Date) => void;
}

interface TimeSlot {
  time: Date;
  available: boolean;
  booked?: boolean;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
}

export function TimeSlotSelector({ mentorId, onTimeSelected }: TimeSlotSelectorProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [disabledDays, setDisabledDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(60);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { 
    data: { 
      slots: AvailableSlot[], 
      disabledDays: number[] 
    }, 
    timestamp: number 
  }>>(new Map());
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const currentRequestRef = useRef<string | null>(null);

  // Memoize week calculations using ISO strings for stable dependencies
  const weekStartISO = useMemo(() => currentWeek.toISOString(), [currentWeek]);
  
  const { weekStart, weekEnd, weekDays } = useMemo(() => {
    const start = new Date(weekStartISO);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return { weekStart: start, weekEnd: end, weekDays: days };
  }, [weekStartISO]);

  // Generate time slots from available slots API response
  const generateTimeSlots = (date: Date, availableSlots: AvailableSlot[]): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    // Filter slots for the selected date
    const dateSlotsFiltered = availableSlots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      return isSameDay(slotDate, date);
    });

    // Convert available slots to TimeSlot format
    dateSlotsFiltered.forEach(slot => {
      const slotTime = new Date(slot.startTime);
      
      // Don't show past slots for today
      if (isToday(date) && isBefore(slotTime, new Date())) {
        return;
      }

      slots.push({
        time: slotTime,
        available: slot.available,
        booked: !slot.available,
      });
    });

    return slots;
  };

  // Fetch available slots from the availability API
  const fetchAvailableSlots = useCallback(async (mentorId: string, weekStartISO: string) => {
    // Parse dates from ISO string
    const startDate = new Date(weekStartISO);
    const endDate = endOfWeek(startDate, { weekStartsOn: 1 });
    
    // Create cache key
    const cacheKey = `${mentorId}-${weekStartISO}`;
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    
    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && (now - cached.timestamp) < cacheExpiry) {
      console.log('[TimeSlotSelector] Using cached data for:', cacheKey);
      if (mountedRef.current) {
        setAvailableSlots(cached.data.slots);
        setDisabledDays(cached.data.disabledDays);
      }
      return cached.data.slots;
    }
    
    // Check if we're already fetching this exact request
    if (currentRequestRef.current === cacheKey) {
      console.log('[TimeSlotSelector] Already fetching this exact request, skipping:', cacheKey);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      console.log('[TimeSlotSelector] Request already in progress, cancelling previous');
      // Cancel the previous request if it's different
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Mark this request as current
    currentRequestRef.current = cacheKey;
    loadingRef.current = true;
    setLoading(true);
    
    console.log('[TimeSlotSelector] Making API call for available slots:', cacheKey);
    
    try {
      const response = await fetch(
        `/api/mentors/${mentorId}/availability/available-slots?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { signal: abortController.signal }
      );
      
      if (response.ok && !abortController.signal.aborted) {
        const data = await response.json();
        const slots = data.slots || [];
        
        // Update session duration if provided
        if (data.sessionDuration) {
          setSessionDuration(data.sessionDuration);
        }
        
        // Update disabled days
        const disabledDaysList = data.disabledDays || [];
        if (mountedRef.current) {
          setDisabledDays(disabledDaysList);
        }
        
        // Update cache with both slots and disabled days
        cacheRef.current.set(cacheKey, { 
          data: { 
            slots: slots, 
            disabledDays: disabledDaysList 
          }, 
          timestamp: now 
        });
        
        // Only update state if component is still mounted
        if (mountedRef.current) {
          setAvailableSlots(slots);
        }
        
        return slots;
      }
      return [];
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to fetch available slots:', error);
      }
      return [];
    } finally {
      if (!abortController.signal.aborted) {
        loadingRef.current = false;
        currentRequestRef.current = null;
        if (mountedRef.current) {
          setLoading(false);
        }
        abortControllerRef.current = null;
      }
    }
  }, []); // Empty dependency array for stable function reference

  // Update time slots when selected date or available slots change
  useEffect(() => {
    if (selectedDate && availableSlots) {
      setTimeSlots(generateTimeSlots(selectedDate, availableSlots));
    }
  }, [selectedDate, availableSlots]);

  // Fetch available slots when week changes
  useEffect(() => {
    // Only fetch if we have a valid mentorId
    if (!mentorId) return;
    
    console.log('[TimeSlotSelector] Scheduling fetch for week:', weekStartISO);
    
    // Small debounce to handle rapid re-renders
    const timeoutId = setTimeout(() => {
      console.log('[TimeSlotSelector] Executing fetch for week:', weekStartISO);
      fetchAvailableSlots(mentorId, weekStartISO);
    }, 50);
    
    return () => {
      console.log('[TimeSlotSelector] Cancelling scheduled fetch');
      clearTimeout(timeoutId);
    };
  }, [mentorId, weekStartISO]); // Only depend on mentorId and weekStartISO

  // Set mounted ref and cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(undefined);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) return;
    
    setSelectedTimeSlot(timeSlot.time);
  };

  const handleConfirmTime = () => {
    if (selectedTimeSlot) {
      onTimeSelected(selectedTimeSlot);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(currentWeek, direction === 'next' ? 7 : -7);
    setCurrentWeek(newWeek);
    setSelectedDate(undefined);
    setSelectedTimeSlot(undefined);
  };

  const isDateSelectable = (date: Date) => {
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isBefore(date, today)) {
      return false;
    }
    
    // Check if the day of week is disabled by mentor
    const dayOfWeek = getDay(date);
    if (disabledDays.includes(dayOfWeek)) {
      return false;
    }
    
    return true;
  };
  
  const isDayDisabled = (date: Date) => {
    const dayOfWeek = getDay(date);
    return disabledDays.includes(dayOfWeek);
  };

  const getDateBadgeCount = (date: Date) => {
    if (!availableSlots) return 0;
    
    // Don't show slot count for disabled days
    if (isDayDisabled(date)) return 0;
    
    const slots = generateTimeSlots(date, availableSlots);
    return slots.filter(slot => slot.available).length;
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select Date & Time
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose your preferred time slot
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px] text-center">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Available Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const isSelectable = isDateSelectable(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDisabled = isDayDisabled(day);
              const isPast = isBefore(day, new Date(new Date().setHours(0, 0, 0, 0)));
              const availableSlots = isSelectable ? getDateBadgeCount(day) : 0;
              
              let buttonClassName = "h-16 p-2 flex flex-col items-center justify-center relative ";
              
              if (isPast) {
                buttonClassName += "opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800";
              } else if (isDisabled) {
                buttonClassName += "opacity-50 cursor-not-allowed bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
              } else if (isSelected) {
                buttonClassName += "bg-blue-500 hover:bg-blue-600 text-white";
              } else if (!isSelectable) {
                buttonClassName += "opacity-50 cursor-not-allowed";
              } else {
                buttonClassName += "hover:bg-gray-100 dark:hover:bg-gray-800";
              }

              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "ghost"}
                  className={buttonClassName}
                  onClick={() => isSelectable && handleDateSelect(day)}
                  disabled={!isSelectable}
                  title={isDisabled ? "Mentor not available on this day" : isPast ? "Past date" : undefined}
                >
                  <div className="text-xs font-medium">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm font-semibold ${isToday(day) ? 'text-blue-500' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  {isSelectable && !isDisabled && availableSlots > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-1 py-0 mt-1 h-4"
                    >
                      {availableSlots}
                    </Badge>
                  )}
                  {isDisabled && !isPast && (
                    <div className="absolute top-1 right-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Available Times - {format(selectedDate, 'EEEE, MMMM d')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No available time slots for this date
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {timeSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={
                      selectedTimeSlot && isSameDay(selectedTimeSlot, slot.time) && 
                      selectedTimeSlot.getHours() === slot.time.getHours()
                        ? "default"
                        : slot.available 
                        ? "outline" 
                        : "ghost"
                    }
                    className={`h-10 text-sm ${
                      !slot.available
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                        : selectedTimeSlot && isSameDay(selectedTimeSlot, slot.time) && 
                          selectedTimeSlot.getHours() === slot.time.getHours()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'hover:bg-blue-50 dark:hover:bg-blue-950/20'
                    }`}
                    onClick={() => handleTimeSlotSelect(slot)}
                    disabled={!slot.available}
                  >
                    {format(slot.time, 'h:mm a')}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Button */}
      {selectedTimeSlot && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Selected Time
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {format(selectedTimeSlot, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
            </div>
          </div>
          <Button onClick={handleConfirmTime} className="ml-4">
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}