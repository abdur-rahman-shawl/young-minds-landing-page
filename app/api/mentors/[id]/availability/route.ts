import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  mentorAvailabilitySchedules, 
  mentorWeeklyPatterns,
  mentorAvailabilityExceptions,
  mentorAvailabilityRules,
  mentors
} from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { validateTimeBlock, validateWeeklySchedule } from '@/lib/utils/availability-validation';
import { requireMentor } from '@/lib/api/guards';

// Validation schemas
const timeBlockSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']),
  maxBookings: z.number().min(1).optional(),
});

const weeklyPatternSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  isEnabled: z.boolean(),
  timeBlocks: z.array(timeBlockSchema),
}).refine(
  (data) => {
    // Additional validation for time blocks within a day
    if (!data.isEnabled || data.timeBlocks.length === 0) return true;
    
    // Check for overlaps within the day's time blocks
    for (let i = 0; i < data.timeBlocks.length; i++) {
      const block = data.timeBlocks[i];
      const otherBlocks = data.timeBlocks.filter((_, index) => index !== i);
      const validation = validateTimeBlock(block, otherBlocks);
      if (!validation.isValid) {
        return false;
      }
    }
    return true;
  },
  {
    message: "Time blocks contain overlapping periods. Each time block must have a unique, non-overlapping time range."
  }
);

const availabilityScheduleSchema = z.object({
  timezone: z.string(),
  defaultSessionDuration: z.number().min(15).max(240),
  bufferTimeBetweenSessions: z.number().min(0).max(60),
  minAdvanceBookingHours: z.number().min(0).max(168),
  maxAdvanceBookingDays: z.number().min(1).max(365),
  defaultStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
  defaultEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
  isActive: z.boolean(),
  allowInstantBooking: z.boolean(),
  requireConfirmation: z.boolean(),
  weeklyPatterns: z.array(weeklyPatternSchema),
});

// GET /api/mentors/[id]/availability - Get mentor's availability schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { id } = await params;
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');

    if (!isAdmin && id !== guard.session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
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

    // Get availability schedule
    const schedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (!schedule.length) {
      // Return default schedule if none exists
      return NextResponse.json({
        success: true,
        schedule: null,
        weeklyPatterns: [],
        exceptions: [],
        rules: [],
        message: 'No availability schedule found. Please set up your availability.'
      });
    }

    // Get weekly patterns
    const weeklyPatterns = await db
      .select()
      .from(mentorWeeklyPatterns)
      .where(eq(mentorWeeklyPatterns.scheduleId, schedule[0].id));

    // Get exceptions (optional: filter by date range from query params)
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    
    let exceptionsQuery = db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(eq(mentorAvailabilityExceptions.scheduleId, schedule[0].id));

    if (startDate && endDate) {
      exceptionsQuery = exceptionsQuery.where(
        and(
          gte(mentorAvailabilityExceptions.startDate, new Date(startDate)),
          lte(mentorAvailabilityExceptions.endDate, new Date(endDate))
        )
      );
    }

    const exceptions = await exceptionsQuery;

    // Get rules
    const rules = await db
      .select()
      .from(mentorAvailabilityRules)
      .where(
        and(
          eq(mentorAvailabilityRules.scheduleId, schedule[0].id),
          eq(mentorAvailabilityRules.isActive, true)
        )
      );

    return NextResponse.json({
      success: true,
      schedule: schedule[0],
      weeklyPatterns,
      exceptions,
      rules
    });

  } catch (error) {
    console.error('Get availability error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

// PUT /api/mentors/[id]/availability - Update mentor's availability schedule
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { id } = await params;
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');

    if (!isAdmin && id !== guard.session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Verify the mentor exists and user has permission
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

    // Only the mentor themselves can update their availability
    if (mentor[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own availability' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // First validate with Zod schema
    let validatedData;
    try {
      validatedData = availabilityScheduleSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Extract specific validation errors
        const errors = error.errors.map(err => {
          if (err.path.includes('timeBlocks')) {
            return 'Time blocks validation failed: Overlapping time periods detected';
          }
          return err.message;
        });
        return NextResponse.json(
          { 
            error: 'Invalid availability data',
            details: errors
          },
          { status: 400 }
        );
      }
      throw error;
    }
    
    // Additional validation for the entire weekly schedule
    const scheduleValidation = validateWeeklySchedule(validatedData.weeklyPatterns);
    if (!scheduleValidation.isValid) {
      const errorDetails = scheduleValidation.errors.map(dayError => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayError.day],
        errors: dayError.errors
      }));
      
      return NextResponse.json(
        { 
          error: 'Schedule contains time conflicts',
          details: errorDetails
        },
        { status: 400 }
      );
    }

    // Start a transaction
    await db.transaction(async (tx) => {
      // Check if schedule exists
      const existingSchedule = await tx
        .select()
        .from(mentorAvailabilitySchedules)
        .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
        .limit(1);

      let scheduleId: string;

      if (existingSchedule.length) {
        // Update existing schedule
        await tx
          .update(mentorAvailabilitySchedules)
          .set({
            timezone: validatedData.timezone,
            defaultSessionDuration: validatedData.defaultSessionDuration,
            bufferTimeBetweenSessions: validatedData.bufferTimeBetweenSessions,
            minAdvanceBookingHours: validatedData.minAdvanceBookingHours,
            maxAdvanceBookingDays: validatedData.maxAdvanceBookingDays,
            defaultStartTime: validatedData.defaultStartTime,
            defaultEndTime: validatedData.defaultEndTime,
            isActive: validatedData.isActive,
            allowInstantBooking: validatedData.allowInstantBooking,
            requireConfirmation: validatedData.requireConfirmation,
            updatedAt: new Date(),
          })
          .where(eq(mentorAvailabilitySchedules.id, existingSchedule[0].id));
        
        scheduleId = existingSchedule[0].id;

        // Delete existing weekly patterns to replace with new ones
        await tx
          .delete(mentorWeeklyPatterns)
          .where(eq(mentorWeeklyPatterns.scheduleId, scheduleId));
      } else {
        // Create new schedule
        const [newSchedule] = await tx
          .insert(mentorAvailabilitySchedules)
          .values({
            mentorId: mentor[0].id,
            timezone: validatedData.timezone,
            defaultSessionDuration: validatedData.defaultSessionDuration,
            bufferTimeBetweenSessions: validatedData.bufferTimeBetweenSessions,
            minAdvanceBookingHours: validatedData.minAdvanceBookingHours,
            maxAdvanceBookingDays: validatedData.maxAdvanceBookingDays,
            defaultStartTime: validatedData.defaultStartTime,
            defaultEndTime: validatedData.defaultEndTime,
            isActive: validatedData.isActive,
            allowInstantBooking: validatedData.allowInstantBooking,
            requireConfirmation: validatedData.requireConfirmation,
          })
          .returning();
        
        scheduleId = newSchedule.id;
      }

      // Insert new weekly patterns
      if (validatedData.weeklyPatterns.length > 0) {
        await tx
          .insert(mentorWeeklyPatterns)
          .values(
            validatedData.weeklyPatterns.map(pattern => ({
              scheduleId,
              dayOfWeek: pattern.dayOfWeek,
              isEnabled: pattern.isEnabled,
              timeBlocks: pattern.timeBlocks,
            }))
          );
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully'
    });

  } catch (error) {
    console.error('Update availability error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}

// POST /api/mentors/[id]/availability - Create initial availability schedule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { id } = await params;
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');

    if (!isAdmin && id !== guard.session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Verify the mentor exists and user has permission
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

    if (mentor[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only create your own availability' },
        { status: 403 }
      );
    }

    // Check if schedule already exists
    const existingSchedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (existingSchedule.length) {
      return NextResponse.json(
        { error: 'Availability schedule already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    const body = await req.json();
    
    // Validate with Zod schema and custom validation
    let validatedData;
    try {
      validatedData = availabilityScheduleSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => {
          if (err.path.includes('timeBlocks')) {
            return 'Time blocks validation failed: Overlapping time periods detected';
          }
          return err.message;
        });
        return NextResponse.json(
          { 
            error: 'Invalid availability data',
            details: errors
          },
          { status: 400 }
        );
      }
      throw error;
    }
    
    // Additional validation for the entire weekly schedule
    const scheduleValidation = validateWeeklySchedule(validatedData.weeklyPatterns);
    if (!scheduleValidation.isValid) {
      const errorDetails = scheduleValidation.errors.map(dayError => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayError.day],
        errors: dayError.errors
      }));
      
      return NextResponse.json(
        { 
          error: 'Schedule contains time conflicts',
          details: errorDetails
        },
        { status: 400 }
      );
    }

    // Create schedule with weekly patterns in a transaction
    const result = await db.transaction(async (tx) => {
      // Create schedule
      const [newSchedule] = await tx
        .insert(mentorAvailabilitySchedules)
        .values({
          mentorId: mentor[0].id,
          timezone: validatedData.timezone,
          defaultSessionDuration: validatedData.defaultSessionDuration,
          bufferTimeBetweenSessions: validatedData.bufferTimeBetweenSessions,
          minAdvanceBookingHours: validatedData.minAdvanceBookingHours,
          maxAdvanceBookingDays: validatedData.maxAdvanceBookingDays,
          defaultStartTime: validatedData.defaultStartTime,
          defaultEndTime: validatedData.defaultEndTime,
          isActive: validatedData.isActive,
          allowInstantBooking: validatedData.allowInstantBooking,
          requireConfirmation: validatedData.requireConfirmation,
        })
        .returning();

      // Insert weekly patterns
      if (validatedData.weeklyPatterns.length > 0) {
        await tx
          .insert(mentorWeeklyPatterns)
          .values(
            validatedData.weeklyPatterns.map(pattern => ({
              scheduleId: newSchedule.id,
              dayOfWeek: pattern.dayOfWeek,
              isEnabled: pattern.isEnabled,
              timeBlocks: pattern.timeBlocks,
            }))
          );
      }

      return newSchedule;
    });

    return NextResponse.json({
      success: true,
      schedule: result,
      message: 'Availability schedule created successfully'
    });

  } catch (error) {
    console.error('Create availability error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create availability' },
      { status: 500 }
    );
  }
}
