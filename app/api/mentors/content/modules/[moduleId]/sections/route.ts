import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, courseSections, sectionContentItems, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createSectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
});

const createContentItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['VIDEO', 'PDF', 'DOCUMENT', 'URL', 'TEXT']),
  orderIndex: z.number().min(0),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  duration: z.number().optional(),
  isPreview: z.boolean().default(false),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    
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

    // Get sections with content items
    const sections = await db.select()
      .from(courseSections)
      .where(eq(courseSections.moduleId, moduleId))
      .orderBy(courseSections.orderIndex);

    const sectionsWithContent = await Promise.all(
      sections.map(async (section) => {
        const contentItems = await db.select()
          .from(sectionContentItems)
          .where(eq(sectionContentItems.sectionId, section.id))
          .orderBy(sectionContentItems.orderIndex);

        return {
          ...section,
          contentItems,
        };
      })
    );

    return NextResponse.json(sectionsWithContent);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    
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

    const body = await request.json();
    const validatedData = createSectionSchema.parse(body);

    // Create section
    const newSection = await db.insert(courseSections)
      .values({
        moduleId: moduleId,
        title: validatedData.title,
        description: validatedData.description,
        orderIndex: validatedData.orderIndex,
      })
      .returning();

    return NextResponse.json(newSection[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}