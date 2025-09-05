import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  orderIndex: z.number().min(0).optional(),
  learningObjectives: z.array(z.string()).optional(),
  estimatedDuration: z.number().min(1).optional(), // in minutes
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id, moduleId } = await params;
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify content exists and belongs to mentor
    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id),
        eq(mentorContent.type, 'COURSE')
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Course content not found' }, { status: 404 });
    }

    // Get course
    const course = await db.select()
      .from(courses)
      .where(eq(courses.contentId, id))
      .limit(1);

    if (!course.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get specific module
    const moduleData = await db.select()
      .from(courseModules)
      .where(and(
        eq(courseModules.id, moduleId),
        eq(courseModules.courseId, course[0].id)
      ))
      .limit(1);

    if (!moduleData.length) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json(moduleData[0]);
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id, moduleId } = await params;
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify content exists and belongs to mentor
    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id),
        eq(mentorContent.type, 'COURSE')
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Course content not found' }, { status: 404 });
    }

    // Get course
    const course = await db.select()
      .from(courses)
      .where(eq(courses.contentId, id))
      .limit(1);

    if (!course.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify module exists
    const existingModule = await db.select()
      .from(courseModules)
      .where(and(
        eq(courseModules.id, moduleId),
        eq(courseModules.courseId, course[0].id)
      ))
      .limit(1);

    if (!existingModule.length) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateModuleSchema.parse(body);

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    // Convert learning objectives array to JSON string if provided
    if (validatedData.learningObjectives) {
      updateData.learningObjectives = JSON.stringify(validatedData.learningObjectives);
    }

    // Convert estimated duration from minutes to the field name expected by DB
    if (validatedData.estimatedDuration) {
      updateData.estimatedDurationMinutes = validatedData.estimatedDuration;
      delete updateData.estimatedDuration;
    }

    // Update module
    const updatedModule = await db.update(courseModules)
      .set(updateData)
      .where(eq(courseModules.id, moduleId))
      .returning();

    return NextResponse.json(updatedModule[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id, moduleId } = await params;
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify content exists and belongs to mentor
    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id),
        eq(mentorContent.type, 'COURSE')
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Course content not found' }, { status: 404 });
    }

    // Get course
    const course = await db.select()
      .from(courses)
      .where(eq(courses.contentId, id))
      .limit(1);

    if (!course.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify module exists
    const existingModule = await db.select()
      .from(courseModules)
      .where(and(
        eq(courseModules.id, moduleId),
        eq(courseModules.courseId, course[0].id)
      ))
      .limit(1);

    if (!existingModule.length) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Delete module (will cascade delete sections and content items)
    await db.delete(courseModules)
      .where(eq(courseModules.id, moduleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}