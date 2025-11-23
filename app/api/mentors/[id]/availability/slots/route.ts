import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  mentorAvailabilitySchedules,
  mentorWeeklyPatterns,
  mentorAvailabilityExceptions,
  mentors,
  sessions
} from '@/lib/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { 
  addDays, 
  addMinutes, 
  format, 
  isBefore, 
  isAfter, 
  isSameDay,
  startOfDay,
  endOfDay,
  getDay,
  parseISO,
  isWithinInterval,
  addHours
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface TimeBlock {
  startTime: string;
  endTime: string;
  type: string;
  maxBookings?: number;
}

interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  reason?: string;
}

// GET /api/mentors/[id]/availability/slots - Get available booking slots
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const {id} = params;
  try {
    // Get query parameters
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const duration = parseInt(req.nextUrl.searchParams.get('duration') || '60');
    const timezone = req.nextUrl.searchParams.get('timezone') || 'UTC';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Verify the mentor exists
    const mentor = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    // Get the mentor's availability schedule
    const schedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (!schedule.length || !schedule[0].isActive) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'Mentor has not set up availability or is currently unavailable'
      });
    }

    const scheduleData = schedule[0];
    
    // Get weekly patterns
    const weeklyPatterns = await db
      .select()
      .from(mentorWeeklyPatterns)
      .where(eq(mentorWeeklyPatterns.scheduleId, scheduleData.id));

    // Get exceptions for the date range
    const exceptions = await db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(
        and(
          eq(mentorAvailabilityExceptions.scheduleId, scheduleData.id),
          lte(mentorAvailabilityExceptions.startDate, new Date(endDate)),
          gte(mentorAvailabilityExceptions.endDate, new Date(startDate))
        )
      );

    // Get existing bookings for the date range
    const existingBookings = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.mentorId, id),
          gte(sessions.scheduledAt, new Date(startDate)),
          lte(sessions.scheduledAt, new Date(endDate)),
          or(
            eq(sessions.status, 'scheduled'),
            eq(sessions.status, 'in_progress')
          )
        )
      );

    // Generate available slots
    const slots: AvailableSlot[] = [];
    const requestDuration = duration || scheduleData.defaultSessionDuration;
    const bufferTime = scheduleData.bufferTimeBetweenSessions;
    const minAdvanceHours = scheduleData.minAdvanceBookingHours;
    const maxAdvanceDays = scheduleData.maxAdvanceBookingDays;

    // Calculate booking window
    const now = new Date();
    const minBookingTime = addHours(now, minAdvanceHours);
    const maxBookingTime = addDays(now, maxAdvanceDays);

    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dayOfWeek = getDay(currentDate);
      
      // Find the weekly pattern for this day
      const dayPattern = weeklyPatterns.find(p => p.dayOfWeek === dayOfWeek);
      
      if (dayPattern && dayPattern.isEnabled) {
        const timeBlocks = dayPattern.timeBlocks as TimeBlock[];
        
        // Process each available time block for the day
        for (const block of timeBlocks) {
          if (block.type !== 'AVAILABLE') continue;

          // Parse time strings and create date objects
          const [startHour, startMinute] = block.startTime.split(':').map(Number);
          const [endHour, endMinute] = block.endTime.split(':').map(Number);
          
          const blockStart = new Date(currentDate);
          blockStart.setHours(startHour, startMinute, 0, 0);
          
          const blockEnd = new Date(currentDate);
          blockEnd.setHours(endHour, endMinute, 0, 0);

          // Generate slots within this block
          let slotStart = new Date(blockStart);
          
          while (addMinutes(slotStart, requestDuration) <= blockEnd) {
            const slotEnd = addMinutes(slotStart, requestDuration);
            
            // Check if slot is within booking window
            if (slotStart < minBookingTime || slotStart > maxBookingTime) {
              slotStart = addMinutes(slotStart, 30); // Move to next potential slot
              continue;
            }

            // Check for exceptions
            let isException = false;
            let exceptionReason = '';
            
            for (const exception of exceptions) {
              const exceptionStart = new Date(exception.startDate);
              const exceptionEnd = new Date(exception.endDate);
              
              if (exception.isFullDay && isSameDay(slotStart, exceptionStart)) {
                isException = true;
                exceptionReason = exception.reason || 'Unavailable';
                break;
              } else if (!exception.isFullDay && exception.timeBlocks) {
                // Check specific time blocks in exception
                const exceptionBlocks = exception.timeBlocks as TimeBlock[];
                for (const exBlock of exceptionBlocks) {
                  const [exStartHour, exStartMin] = exBlock.startTime.split(':').map(Number);
                  const [exEndHour, exEndMin] = exBlock.endTime.split(':').map(Number);
                  
                  const exBlockStart = new Date(slotStart);
                  exBlockStart.setHours(exStartHour, exStartMin, 0, 0);
                  
                  const exBlockEnd = new Date(slotStart);
                  exBlockEnd.setHours(exEndHour, exEndMin, 0, 0);
                  
                  if (
                    (slotStart >= exBlockStart && slotStart < exBlockEnd) ||
                    (slotEnd > exBlockStart && slotEnd <= exBlockEnd)
                  ) {
                    isException = true;
                    exceptionReason = exception.reason || 'Unavailable';
                    break;
                  }
                }
              }
            }

            if (isException) {
              slots.push({
                startTime: slotStart,
                endTime: slotEnd,
                available: false,
                reason: exceptionReason
              });
              slotStart = addMinutes(slotStart, 30);
              continue;
            }

            // Check for existing bookings (including buffer time)
            let isBooked = false;
            for (const booking of existingBookings) {
              const bookingStart = new Date(booking.scheduledAt);
              const bookingEnd = addMinutes(bookingStart, booking.duration);
              
              // Add buffer time before and after booking
              const bufferedBookingStart = addMinutes(bookingStart, -bufferTime);
              const bufferedBookingEnd = addMinutes(bookingEnd, bufferTime);
              
              if (
                (slotStart >= bufferedBookingStart && slotStart < bufferedBookingEnd) ||
                (slotEnd > bufferedBookingStart && slotEnd <= bufferedBookingEnd) ||
                (slotStart <= bufferedBookingStart && slotEnd >= bufferedBookingEnd)
              ) {
                isBooked = true;
                break;
              }
            }

            // Add the slot
            slots.push({
              startTime: slotStart,
              endTime: slotEnd,
              available: !isBooked,
              reason: isBooked ? 'Already booked' : undefined
            });

            // Move to next potential slot (30-minute intervals)
            slotStart = addMinutes(slotStart, 30);
          }
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convert times to requested timezone if needed
    const convertedSlots = slots.map(slot => {
      if (timezone !== scheduleData.timezone) {
        // Convert from mentor's timezone to requested timezone
        const zonedStart = toZonedTime(slot.startTime, scheduleData.timezone);
        const zonedEnd = toZonedTime(slot.endTime, scheduleData.timezone);
        
        return {
          ...slot,
          startTime: fromZonedTime(zonedStart, timezone),
          endTime: fromZonedTime(zonedEnd, timezone),
        };
      }
      return slot;
    });

    // Sort slots by start time
    convertedSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return NextResponse.json({
      success: true,
      slots: convertedSlots,
      mentorTimezone: scheduleData.timezone,
      requestedTimezone: timezone,
      sessionDuration: requestDuration,
      bufferTime: bufferTime
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}