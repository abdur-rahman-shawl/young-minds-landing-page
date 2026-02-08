import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, courseSections, sectionContentItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';
import { getMentorContentOwnershipCondition, getMentorForContent } from '@/lib/api/mentor-content';
import { normalizeStorageValue, resolveStorageUrl } from '@/lib/storage';

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
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;

    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    const session = guard.session;
    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    const ownershipCondition = getMentorContentOwnershipCondition(mentor?.id ?? null, isAdmin);
    if (!ownershipCondition) {
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
        ownershipCondition
      ))
      .limit(1);

    if (!sectionWithCourse.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Get content items
    const contentItems = await db.select()
      .from(sectionContentItems)
      .where(eq(sectionContentItems.sectionId, sectionId))
      .orderBy(sectionContentItems.orderIndex);

    const hydratedItems = await Promise.all(
      contentItems.map(async (item) => ({
        ...item,
        fileUrl: await resolveStorageUrl(item.fileUrl),
      }))
    );

    return NextResponse.json(hydratedItems);
  } catch (error) {
    console.error('Error fetching content items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;

    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    const session = guard.session;
    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    const ownershipCondition = getMentorContentOwnershipCondition(mentor?.id ?? null, isAdmin);
    if (!ownershipCondition) {
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
        ownershipCondition
      ))
      .limit(1);

    if (!sectionWithCourse.length) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createContentItemSchema.parse(body);

    // Validate type-specific requirements
    if (validatedData.type === 'TEXT' && !validatedData.content) {
      return NextResponse.json(
        { error: 'Content is required for TEXT type items' },
        { status: 400 }
      );
    }

    if ((validatedData.type === 'VIDEO' || validatedData.type === 'PDF' || validatedData.type === 'DOCUMENT') && !validatedData.fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required for file-based content items' },
        { status: 400 }
      );
    }

    if (validatedData.type === 'URL' && !validatedData.content) {
      return NextResponse.json(
        { error: 'URL is required for URL type items' },
        { status: 400 }
      );
    }

    // Create content item
    const newContentItem = await db.insert(sectionContentItems)
      .values({
        sectionId: sectionId,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        orderIndex: validatedData.orderIndex,
        content: validatedData.content,
        fileUrl: normalizeStorageValue(validatedData.fileUrl),
        fileName: validatedData.fileName,
        fileSize: validatedData.fileSize,
        mimeType: validatedData.mimeType,
        duration: validatedData.duration,
        isPreview: validatedData.isPreview,
      })
      .returning();

    return NextResponse.json(
      {
        ...newContentItem[0],
        fileUrl: await resolveStorageUrl(newContentItem[0].fileUrl),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating content item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
