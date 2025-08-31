"use client"

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { 
  format, 
  addMonths,
  subMonths,
  startOfMonth, 
  endOfMonth, 
  startOfWeek,
  endOfWeek,
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  isPast,
  isSameMonth,
  parseISO,
  endOfDay
} from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSlotSelectorProps {
  mentorId: string;
  onTimeSelected: (selectedTime: Date) => void;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
}

interface MonthAvailability {
  [day: string]: boolean; // format: "yyyy-MM-dd"
}

export function TimeSlotSelectorV2({ mentorId, onTimeSelected }: TimeSlotSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date>();
  
  const [dailySlots, setDailySlots] = useState<AvailableSlot[]>([]);
  const [monthAvailability, setMonthAvailability] = useState<MonthAvailability>({});
  
  const [dailyLoading, setDailyLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(true);

  const [mentorTimezone, setMentorTimezone] = useState<string>('UTC');
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const firstDayOfMonth = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const lastDayOfMonth = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }),
      end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 }),
    });
  }, [firstDayOfMonth, lastDayOfMonth]);

  const fetchMonthAvailability = useCallback(async (month: Date) => {
    setMonthLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startOfMonth(month).toISOString(),
        endDate: endOfMonth(month).toISOString(),
        timezone: userTimezone,
      });
      const response = await fetch(`/api/mentors/${mentorId}/availability/slots?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        const availability: MonthAvailability = {};
        (data.slots || []).forEach((slot: AvailableSlot) => {
          const day = format(parseISO(slot.startTime), 'yyyy-MM-dd');
          availability[day] = true;
        });
        setMonthAvailability(availability);
        setMentorTimezone(data.mentorTimezone || 'UTC');
      } else {
        toast.error(data.message || 'Failed to load monthly availability');
      }
    } catch (error) {
      toast.error('An error occurred while fetching availability.');
    } finally {
      setMonthLoading(false);
    }
  }, [mentorId, userTimezone]);

  const fetchDailySlots = useCallback(async (date: Date) => {
    setDailyLoading(true);
    setDailySlots([]);
    try {
      const params = new URLSearchParams({
        startDate: date.toISOString(),
        endDate: endOfDay(date).toISOString(),
        timezone: userTimezone,
      });
      const response = await fetch(`/api/mentors/${mentorId}/availability/slots?${params}`);
      const data = await response.json();
      if (response.ok) {
        setDailySlots(data.slots || []);
      } else {
        toast.error(data.message || 'Failed to load time slots');
      }
    } catch (error) {
      toast.error('An error occurred while fetching time slots.');
    } finally {
      setDailyLoading(false);
    }
  }, [mentorId, userTimezone]);

  useEffect(() => {
    fetchMonthAvailability(currentMonth);
  }, [currentMonth, fetchMonthAvailability]);

  useEffect(() => {
    if (selectedDate) {
      fetchDailySlots(selectedDate);
    }
  }, [selectedDate, fetchDailySlots]);

  const handleDateClick = (day: Date) => {
    if (isPast(day) && !isToday(day)) return;
    setSelectedDate(day);
    setSelectedTimeSlot(undefined);
  };

  const handleTimeSlotSelection = (slot: AvailableSlot) => {
    const slotTime = parseISO(slot.startTime);
    setSelectedTimeSlot(slotTime);
  };

  const handleConfirm = () => {
    if (selectedTimeSlot) {
      onTimeSelected(selectedTimeSlot);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          {monthLoading ? (
            <Skeleton className="w-full h-64" />
          ) : (
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 pb-2">
                  {day}
                </div>
              ))}
              {calendarDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isDayInPast = isPast(day) && !isToday(day);
                const isDayInCurrentMonth = isSameMonth(day, currentMonth);
                const hasAvailability = monthAvailability[dayStr];
                const isSelectable = !isDayInPast && hasAvailability;

                return (
                  <div key={day.toString()} className="py-1">
                    <Button
                      variant={selectedDate && isSameDay(day, selectedDate) ? 'default' : 'ghost'}
                      className={cn(
                        "w-10 h-10 p-0 rounded-full",
                        !isDayInCurrentMonth && "text-gray-400 dark:text-gray-500",
                        isToday(day) && "ring-2 ring-blue-500 dark:ring-blue-400",
                        !isSelectable && "text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                      )}
                      onClick={() => isSelectable && handleDateClick(day)}
                      disabled={!isSelectable}
                    >
                      {format(day, 'd')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timezone Info */}
      {mentorTimezone !== userTimezone && (
        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
          <Globe className="h-3 w-3 mr-1.5" />
          All times are in your local timezone: {userTimezone}
        </div>
      )}

      {/* Time Slots Section */}
      {selectedDate && (
        <div className="pt-4">
          <h4 className="font-semibold mb-3 text-center">
            Available Times for {format(selectedDate, 'EEEE, MMMM d')}
          </h4>
          <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
            {dailyLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : dailySlots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {dailySlots.map((slot, index) => {
                  const slotTime = parseISO(slot.startTime);
                  const isSelected = selectedTimeSlot && selectedTimeSlot.getTime() === slotTime.getTime();
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleTimeSlotSelection(slot)}
                    >
                      {format(slotTime, 'h:mm a')}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 py-8">
                <Clock className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No available slots</p>
                <p className="text-xs">Please select another date.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Button */}
      {selectedTimeSlot && (
        <div className="pt-4 text-center border-t mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            You selected: <span className="font-semibold text-gray-900 dark:text-white">{format(selectedTimeSlot, 'h:mm a')}</span>
          </p>
          <Button onClick={handleConfirm} size="lg">
            Confirm Time and Continue
          </Button>
        </div>
      )}
    </div>
  );
}