import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Get modules
    const modules = await db.select()
      .from(courseModules)
      .where(eq(courseModules.courseId, course[0].id))
      .orderBy(courseModules.orderIndex);

    return NextResponse.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const body = await request.json();
    const validatedData = createModuleSchema.parse(body);

    // Create module
    const newModule = await db.insert(courseModules)
      .values({
        courseId: course[0].id,
        title: validatedData.title,
        description: validatedData.description,
        orderIndex: validatedData.orderIndex,
      })
      .returning();

    return NextResponse.json(newModule[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}