import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, courseSections, sectionContentItems, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';

const updateContentItemSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  type: z.enum(['VIDEO', 'PDF', 'DOCUMENT', 'URL', 'TEXT']).optional(),
  orderIndex: z.number().min(0).optional(),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  duration: z.number().optional(),
  isPreview: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string; itemId: string }> }
) {
  try {
    const { sectionId, itemId } = await params;
    
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify section exists and belongs to mentor's course
    const sectionWithCourse = await db.select({
      section: courseSections,
      module: courseModules,
      course: courses,
      content: mentorContent,
    })
    .from(courseSections)
    .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
    .where(and(
      eq(courseSections.id, sectionId),
      eq(mentorContent.mentorId, mentor[0].id)
    ))
    .limit(1);

    if (!sectionWithCourse.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Get specific content item
    const contentItem = await db.select()
      .from(sectionContentItems)
      .where(and(
        eq(sectionContentItems.id, itemId),
        eq(sectionContentItems.sectionId, sectionId)
      ))
      .limit(1);

    if (!contentItem.length) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    return NextResponse.json(contentItem[0]);
  } catch (error) {
    console.error('Error fetching content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string; itemId: string }> }
) {
  try {
    const { sectionId, itemId } = await params;
    
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify section exists and belongs to mentor's course
    const sectionWithCourse = await db.select({
      section: courseSections,
      module: courseModules,
      course: courses,
      content: mentorContent,
    })
    .from(courseSections)
    .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
    .where(and(
      eq(courseSections.id, sectionId),
      eq(mentorContent.mentorId, mentor[0].id)
    ))
    .limit(1);

    if (!sectionWithCourse.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Verify content item exists
    const existingItem = await db.select()
      .from(sectionContentItems)
      .where(and(
        eq(sectionContentItems.id, itemId),
        eq(sectionContentItems.sectionId, sectionId)
      ))
      .limit(1);

    if (!existingItem.length) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateContentItemSchema.parse(body);

    // Update content item
    const updatedItem = await db.update(sectionContentItems)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(sectionContentItems.id, itemId))
      .returning();

    return NextResponse.json(updatedItem[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string; itemId: string }> }
) {
  try {
    const { sectionId, itemId } = await params;
    
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify section exists and belongs to mentor's course
    const sectionWithCourse = await db.select({
      section: courseSections,
      module: courseModules,
      course: courses,
      content: mentorContent,
    })
    .from(courseSections)
    .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
    .where(and(
      eq(courseSections.id, sectionId),
      eq(mentorContent.mentorId, mentor[0].id)
    ))
    .limit(1);

    if (!sectionWithCourse.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Verify content item exists
    const existingItem = await db.select()
      .from(sectionContentItems)
      .where(and(
        eq(sectionContentItems.id, itemId),
        eq(sectionContentItems.sectionId, sectionId)
      ))
      .limit(1);

    if (!existingItem.length) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    // Delete content item
    await db.delete(sectionContentItems)
      .where(eq(sectionContentItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
