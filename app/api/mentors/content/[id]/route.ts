import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, courseSections, sectionContentItems, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';
import { normalizeStorageValue, resolveStorageUrl } from '@/lib/storage';

const updateContentSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  
  // For FILE type
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  
  // For URL type
  url: z.string().refine((val) => !val || val === '' || /^https?:\/\/.+/.test(val), {
    message: 'Invalid URL format'
  }).optional(),
  urlTitle: z.string().optional(),
  urlDescription: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { id } = await params;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, guard.session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id)
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // If it's a course, get course details with modules and sections
    if (content[0].type === 'COURSE') {
      const courseDetails = await db.select()
        .from(courses)
        .where(eq(courses.contentId, id))
        .limit(1);

      if (courseDetails.length) {
        const modules = await db.select()
          .from(courseModules)
          .where(eq(courseModules.courseId, courseDetails[0].id))
          .orderBy(courseModules.orderIndex);

        const modulesWithSections = await Promise.all(
          modules.map(async (module) => {
            const sections = await db.select()
              .from(courseSections)
              .where(eq(courseSections.moduleId, module.id))
              .orderBy(courseSections.orderIndex);

            const sectionsWithContent = await Promise.all(
              sections.map(async (section) => {
                const contentItems = await db.select()
                  .from(sectionContentItems)
                  .where(eq(sectionContentItems.sectionId, section.id))
                  .orderBy(sectionContentItems.orderIndex);

                const hydratedItems = await Promise.all(
                  contentItems.map(async (item) => ({
                    ...item,
                    fileUrl: await resolveStorageUrl(item.fileUrl),
                  }))
                );

                return {
                  ...section,
                  contentItems: hydratedItems,
                };
              })
            );

            return {
              ...module,
              sections: sectionsWithContent,
            };
          })
        );

        return NextResponse.json({
          ...content[0],
          fileUrl: await resolveStorageUrl(content[0].fileUrl),
          course: {
            ...courseDetails[0],
            modules: modulesWithSections,
          },
        });
      }
    }

    return NextResponse.json({
      ...content[0],
      fileUrl: await resolveStorageUrl(content[0].fileUrl),
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { id } = await params;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, guard.session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('Update content request body:', body);
    const validatedData = updateContentSchema.parse(body);
    console.log('Validated content data:', validatedData);

    const updatedContent = await db.update(mentorContent)
      .set({
        ...validatedData,
        fileUrl: normalizeStorageValue(validatedData.fileUrl),
        updatedAt: new Date(),
      })
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id)
      ))
      .returning();

    if (!updatedContent.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedContent[0],
      fileUrl: await resolveStorageUrl(updatedContent[0].fileUrl),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { id } = await params;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, guard.session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const deletedContent = await db.delete(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id)
      ))
      .returning();

    if (!deletedContent.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
