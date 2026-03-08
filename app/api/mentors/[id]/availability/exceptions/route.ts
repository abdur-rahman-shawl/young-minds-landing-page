import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  mentorAvailabilitySchedules,
  mentorAvailabilityExceptions,
  mentors
} from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';

// Validation schema for exceptions
const exceptionSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']).default('BLOCKED'),
  reason: z.string().optional(),
  isFullDay: z.boolean().default(true),
  timeBlocks: z.array(z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']),
  })).optional(),
});

// GET /api/mentors/[id]/availability/exceptions - Get mentor's availability exceptions
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }

    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    if (!isAdmin && params.id !== guard.session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for date range filtering
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    // Verify the mentor exists
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

    // Get the mentor's availability schedule
    const schedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (!schedule.length) {
      return NextResponse.json({
        success: true,
        exceptions: [],
        message: 'No availability schedule found'
      });
    }

    // Build the query for exceptions
    let exceptionsQuery = db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(eq(mentorAvailabilityExceptions.scheduleId, schedule[0].id));

    // Apply date range filter if provided
    if (startDate && endDate) {
      exceptionsQuery = exceptionsQuery.where(
        and(
          gte(mentorAvailabilityExceptions.startDate, new Date(startDate)),
          lte(mentorAvailabilityExceptions.endDate, new Date(endDate))
        )
      );
    }

    const exceptions = await exceptionsQuery;

    return NextResponse.json({
      success: true,
      exceptions
    });

  } catch (error) {
    console.error('Get exceptions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability exceptions' },
      { status: 500 }
    );
  }
}

// POST /api/mentors/[id]/availability/exceptions - Create availability exception
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }

    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    if (!isAdmin && params.id !== guard.session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the mentor exists and user has permission
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

    // Only the mentor themselves can add exceptions
    if (mentor[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only manage your own availability' },
        { status: 403 }
      );
    }

    // Get the mentor's availability schedule
    const schedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (!schedule.length) {
      return NextResponse.json(
        { error: 'No availability schedule found. Please set up your availability first.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = exceptionSchema.parse(body);

    // Validate date range
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    // Check for overlapping exceptions
    const overlappingExceptions = await db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(
        and(
          eq(mentorAvailabilityExceptions.scheduleId, schedule[0].id),
          lte(mentorAvailabilityExceptions.startDate, endDate),
          gte(mentorAvailabilityExceptions.endDate, startDate)
        )
      );

    if (overlappingExceptions.length > 0) {
      return NextResponse.json(
        { error: 'This exception overlaps with an existing exception' },
        { status: 409 }
      );
    }

    // Create the exception
    const [newException] = await db
      .insert(mentorAvailabilityExceptions)
      .values({
        scheduleId: schedule[0].id,
        startDate,
        endDate,
        type: validatedData.type,
        reason: validatedData.reason,
        isFullDay: validatedData.isFullDay,
        timeBlocks: validatedData.timeBlocks,
      })
      .returning();

    return NextResponse.json({
      success: true,
      exception: newException,
      message: 'Availability exception created successfully'
    });

  } catch (error) {
    console.error('Create exception error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create availability exception' },
      { status: 500 }
    );
  }
}

// DELETE /api/mentors/[id]/availability/exceptions - Delete multiple exceptions
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireMentor(req, true);
    if ('error' in guard) {
      return guard.error;
    }

    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    if (!isAdmin && params.id !== guard.session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the mentor exists and user has permission
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

    if (mentor[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only manage your own availability' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { exceptionIds } = z.object({
      exceptionIds: z.array(z.string().uuid())
    }).parse(body);

    if (exceptionIds.length === 0) {
      return NextResponse.json(
        { error: 'No exception IDs provided' },
        { status: 400 }
      );
    }

    // Get the mentor's schedule
    const schedule = await db
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor[0].id))
      .limit(1);

    if (!schedule.length) {
      return NextResponse.json(
        { error: 'No availability schedule found' },
        { status: 404 }
      );
    }

    // Delete the exceptions
    const deletedCount = await db.transaction(async (tx) => {
      let count = 0;
      for (const exceptionId of exceptionIds) {
        const result = await tx
          .delete(mentorAvailabilityExceptions)
          .where(
            and(
              eq(mentorAvailabilityExceptions.id, exceptionId),
              eq(mentorAvailabilityExceptions.scheduleId, schedule[0].id)
            )
          );
        if (result) count++;
      }
      return count;
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} exception(s) deleted successfully`
    });

  } catch (error) {
    console.error('Delete exceptions error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete exceptions' },
      { status: 500 }
    );
  }
}
