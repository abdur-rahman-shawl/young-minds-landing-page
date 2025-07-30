import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, courseSections, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateSectionSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  orderIndex: z.number().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string; sectionId: string }> }
) {
  try {
    const { moduleId, sectionId } = await params;
    
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

    // Verify module exists and belongs to mentor's course
    const moduleWithCourse = await db.select({
      module: courseModules,
      course: courses,
      content: mentorContent,
    })
    .from(courseModules)
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
    .where(and(
      eq(courseModules.id, moduleId),
      eq(mentorContent.mentorId, mentor[0].id)
    ))
    .limit(1);

    if (!moduleWithCourse.length) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Get specific section
    const section = await db.select()
      .from(courseSections)
      .where(and(
        eq(courseSections.id, sectionId),
        eq(courseSections.moduleId, moduleId)
      ))
      .limit(1);

    if (!section.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json(section[0]);
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string; sectionId: string }> }
) {
  try {
    const { moduleId, sectionId } = await params;
    
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

    // Verify module exists and belongs to mentor's course
    const moduleWithCourse = await db.select({
      module: courseModules,
      course: courses,
      content: mentorContent,
    })
    .from(courseModules)
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
    .where(and(
      eq(courseModules.id, moduleId),
      eq(mentorContent.mentorId, mentor[0].id)
    ))
    .limit(1);

    if (!moduleWithCourse.length) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify section exists
    const existingSection = await db.select()
      .from(courseSections)
      .where(and(
        eq(courseSections.id, sectionId),
        eq(courseSections.moduleId, moduleId)
      ))
      .limit(1);

    if (!existingSection.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateSectionSchema.parse(body);

    // Update section
    const updatedSection = await db.update(courseSections)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(courseSections.id, sectionId))
      .returning();

    return NextResponse.json(updatedSection[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string; sectionId: string }> }
) {
  try {
    const { moduleId, sectionId } = await params;
    
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

    // Verify module exists and belongs to mentor's course
    const moduleWithCourse = await db.select({
      module: courseModules,
      course: courses,
      content: mentorContent,
    })
    .from(courseModules)
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
    .where(and(
      eq(courseModules.id, moduleId),
      eq(mentorContent.mentorId, mentor[0].id)
    ))
    .limit(1);

    if (!moduleWithCourse.length) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify section exists
    const existingSection = await db.select()
      .from(courseSections)
      .where(and(
        eq(courseSections.id, sectionId),
        eq(courseSections.moduleId, moduleId)
      ))
      .limit(1);

    if (!existingSection.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Delete section (will cascade delete content items)
    await db.delete(courseSections)
      .where(eq(courseSections.id, sectionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}