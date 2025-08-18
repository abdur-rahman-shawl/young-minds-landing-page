import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  mentorAvailabilitySchedules, 
  mentorWeeklyPatterns,
  mentorAvailabilityExceptions,
  sessions,
  mentors
} from '@/lib/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  addDays, 
  addMinutes,
  isBefore,
  isAfter,
  isWithinInterval,
  getDay,
  parse,
  addHours,
  setHours,
  setMinutes,
  setSeconds
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { applyBlockedTimes } from '@/lib/utils/availability-validation';

interface TimeBlock {
  startTime: string;
  endTime: string;
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
}

interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  reason?: string;
}

// GET /api/mentors/[id]/availability/available-slots
// Returns available time slots for a mentor within a date range
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate date range (max 90 days)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 90 days' },
        { status: 400 }
      );
    }

    // Get mentor
    const mentor = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, params.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    // Get availability schedule
    const schedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    // If no schedule or inactive, return empty slots
    if (!schedule.length || !schedule[0].isActive) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'Mentor has not set up availability'
      });
    }

    const availabilitySchedule = schedule[0];

    // Get weekly patterns
    const weeklyPatterns = await db
      .select()
      .from(mentorWeeklyPatterns)
      .where(eq(mentorWeeklyPatterns.scheduleId, availabilitySchedule.id));
    
    // Calculate disabled days (days where isEnabled is false or not in patterns)
    const enabledDaysSet = new Set(
      weeklyPatterns
        .filter(p => p.isEnabled && p.timeBlocks && (p.timeBlocks as any[]).length > 0)
        .map(p => p.dayOfWeek)
    );
    
    // Days 0-6 (Sunday-Saturday) that are disabled
    const disabledDays = [0, 1, 2, 3, 4, 5, 6].filter(day => !enabledDaysSet.has(day));

    // Get exceptions for the date range
    const exceptions = await db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(
        and(
          eq(mentorAvailabilityExceptions.scheduleId, availabilitySchedule.id),
          or(
            and(
              lte(mentorAvailabilityExceptions.startDate, end),
              gte(mentorAvailabilityExceptions.endDate, start)
            ),
            and(
              gte(mentorAvailabilityExceptions.startDate, start),
              lte(mentorAvailabilityExceptions.startDate, end)
            )
          )
        )
      );

    // Get existing bookings for the date range
    const existingBookings = await db
      .select({
        scheduledAt: sessions.scheduledAt,
        duration: sessions.duration,
        status: sessions.status
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.mentorId, mentor[0].id),
          gte(sessions.scheduledAt, start),
          lte(sessions.scheduledAt, end),
          eq(sessions.status, 'scheduled')
        )
      );

    // Generate available slots
    const availableSlots: AvailableSlot[] = [];
    const timezone = availabilitySchedule.timezone;
    const sessionDuration = availabilitySchedule.defaultSessionDuration;
    const bufferTime = availabilitySchedule.bufferTimeBetweenSessions;
    const minAdvanceHours = availabilitySchedule.minAdvanceBookingHours;
    const maxAdvanceDays = availabilitySchedule.maxAdvanceBookingDays;

    // Calculate booking window
    const now = new Date();
    const earliestBookingTime = addHours(now, minAdvanceHours);
    const latestBookingTime = addDays(now, maxAdvanceDays);

    // Iterate through each day in the range
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = getDay(currentDate);
      
      // Find weekly pattern for this day
      const pattern = weeklyPatterns.find(p => p.dayOfWeek === dayOfWeek);
      
      if (pattern && pattern.isEnabled && pattern.timeBlocks) {
        // Check if this day is within an exception period
        const isException = exceptions.some(exc => 
          isWithinInterval(currentDate, {
            start: exc.startDate,
            end: exc.endDate
          }) && exc.type === 'UNAVAILABLE'
        );

        if (!isException) {
          // Process time blocks for this day
          const timeBlocks = pattern.timeBlocks as TimeBlock[];
          
          // Separate blocks by type
          const availableBlocks = timeBlocks.filter(b => b.type === 'AVAILABLE');
          const blockedBlocks = timeBlocks.filter(b => 
            b.type === 'BLOCKED' || b.type === 'BREAK' || b.type === 'BUFFER'
          );
          
          // Apply blocked times to available blocks
          const effectiveBlocks = applyBlockedTimes(availableBlocks, blockedBlocks);
          
          // Process each effective available block
          for (const block of effectiveBlocks) {
            if (block.type === 'AVAILABLE') {
              // Parse time strings and create Date objects
              const [startHour, startMinute] = block.startTime.split(':').map(Number);
              const [endHour, endMinute] = block.endTime.split(':').map(Number);
              
              let slotStart = new Date(currentDate);
              slotStart = setHours(slotStart, startHour);
              slotStart = setMinutes(slotStart, startMinute);
              slotStart = setSeconds(slotStart, 0);
              
              let blockEnd = new Date(currentDate);
              blockEnd = setHours(blockEnd, endHour);
              blockEnd = setMinutes(blockEnd, endMinute);
              blockEnd = setSeconds(blockEnd, 0);
              
              // Generate slots within this effective available block
              while (slotStart < blockEnd) {
                const slotEnd = addMinutes(slotStart, sessionDuration);
                
                // Ensure the entire slot fits within the block
                if (slotEnd > blockEnd) break;
                
                // Check if slot is within booking window
                if (slotStart >= earliestBookingTime && slotStart <= latestBookingTime) {
                  // Check for conflicts with existing bookings (including buffer time)
                  const hasConflict = existingBookings.some(booking => {
                    const bookingStart = new Date(booking.scheduledAt);
                    const bookingEnd = addMinutes(bookingStart, booking.duration);
                    // Add buffer time to both sides of existing booking
                    const bufferedStart = addMinutes(bookingStart, -bufferTime);
                    const bufferedEnd = addMinutes(bookingEnd, bufferTime);
                    
                    // Check if there's an overlap with the buffered booking time
                    return (
                      (slotStart >= bufferedStart && slotStart < bufferedEnd) ||
                      (slotEnd > bufferedStart && slotEnd <= bufferedEnd) ||
                      (slotStart <= bufferedStart && slotEnd >= bufferedEnd)
                    );
                  });
                  
                  if (!hasConflict) {
                    availableSlots.push({
                      startTime: slotStart.toISOString(),
                      endTime: slotEnd.toISOString(),
                      available: true
                    } as any);
                  }
                }
                
                // Move to next slot (including buffer time)
                slotStart = addMinutes(slotEnd, bufferTime);
              }
            }
          }
        }
      }
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // Sort slots by start time (convert ISO strings to Date for comparison)
    availableSlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json({
      success: true,
      slots: availableSlots,
      sessionDuration,
      timezone,
      disabledDays,
      total: availableSlots.length
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}