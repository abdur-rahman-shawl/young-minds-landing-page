import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, courses, courseModules, courseSections, sectionContentItems, contentReviewAudit } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';
import { getMentorContentOwnershipCondition, getMentorForContent } from '@/lib/api/mentor-content';
import { deleteStorageValues, normalizeStorageValue, resolveStorageUrl } from '@/lib/storage';

const updateContentSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),

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

const mentorEditableStatuses = new Set(['DRAFT', 'REJECTED']);
const PURGE_RETENTION_DAYS = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;
    if (!session?.user) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }
    const isAdmin = guard.user.roles.some((role: any) => role.name === 'admin');

    const { id } = await params;

    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    const ownershipCondition = getMentorContentOwnershipCondition(mentor?.id ?? null, isAdmin);
    if (!ownershipCondition) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        ownershipCondition
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    if (!isAdmin && content[0].deletedAt) {
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
          modules.map(async (module: any) => {
            const sections = await db.select()
              .from(courseSections)
              .where(eq(courseSections.moduleId, module.id))
              .orderBy(courseSections.orderIndex);

            const sectionsWithContent = await Promise.all(
              sections.map(async (section: any) => {
                const contentItems = await db.select()
                  .from(sectionContentItems)
                  .where(eq(sectionContentItems.sectionId, section.id))
                  .orderBy(sectionContentItems.orderIndex);

                const hydratedItems = await Promise.all(
                  contentItems.map(async (item: any) => ({
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
    const session = guard.session;
    if (!session?.user) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }
    const isAdmin = guard.user.roles.some((role: any) => role.name === 'admin');

    const { id } = await params;

    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    const ownershipCondition = getMentorContentOwnershipCondition(mentor?.id ?? null, isAdmin);
    if (!ownershipCondition) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateContentSchema.parse(body);
    const { status: requestedStatus, ...mutableFields } = validatedData;
    const mutableKeys = Object.keys(mutableFields);
    const hasFieldUpdates = mutableKeys.length > 0;

    const existingContent = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        ownershipCondition
      ))
      .limit(1);

    if (!existingContent.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const currentContent = existingContent[0];
    if (!isAdmin && currentContent.deletedAt) {
      return NextResponse.json(
        { error: 'Deleted content cannot be modified' },
        { status: 400 }
      );
    }

    const updatePayload: Partial<typeof mentorContent.$inferInsert> = {
      updatedAt: new Date(),
    };

    for (const key of mutableKeys) {
      const value = mutableFields[key as keyof typeof mutableFields];
      if (key === 'fileUrl') {
        updatePayload.fileUrl = normalizeStorageValue(value as string | undefined);
      } else {
        (updatePayload as any)[key] = value;
      }
    }

    let reviewAction: 'ARCHIVED' | 'RESTORED' | null = null;
    let nextStatus = currentContent.status;

    if (isAdmin && requestedStatus !== undefined) {
      return NextResponse.json(
        { error: 'Use admin review API for status transitions' },
        { status: 400 }
      );
    }

    if (!isAdmin && hasFieldUpdates && !mentorEditableStatuses.has(currentContent.status)) {
      return NextResponse.json(
        { error: `Content in status '${currentContent.status}' is not editable` },
        { status: 400 }
      );
    }

    if (requestedStatus !== undefined) {
      if (hasFieldUpdates && !isAdmin) {
        return NextResponse.json(
          { error: 'Update content fields and status in separate actions' },
          { status: 400 }
        );
      }

      if (isAdmin) {
        return NextResponse.json(
          { error: 'Use admin review API for status transitions' },
          { status: 400 }
        );
      }

      if (requestedStatus === 'ARCHIVED') {
        if (currentContent.status === 'ARCHIVED') {
          return NextResponse.json({ error: 'Content is already archived' }, { status: 400 });
        }

        if (currentContent.status === 'PENDING_REVIEW') {
          return NextResponse.json(
            { error: 'Content under review cannot be archived' },
            { status: 400 }
          );
        }

        updatePayload.status = 'ARCHIVED';
        updatePayload.statusBeforeArchive = currentContent.status;
        nextStatus = 'ARCHIVED';
        reviewAction = 'ARCHIVED';
      } else if (currentContent.status === 'ARCHIVED' && (requestedStatus === 'DRAFT' || requestedStatus === 'APPROVED')) {
        const restoreStatus =
          currentContent.statusBeforeArchive === 'APPROVED' && !currentContent.requireReviewAfterRestore
            ? 'APPROVED'
            : 'DRAFT';

        updatePayload.status = restoreStatus as any;
        updatePayload.statusBeforeArchive = null;
        updatePayload.deletedAt = null;
        updatePayload.deletedBy = null;
        updatePayload.deleteReason = null;
        updatePayload.purgeAfterAt = null;
        nextStatus = restoreStatus;
        reviewAction = 'RESTORED';
      } else {
        return NextResponse.json(
          { error: `Direct transition to '${requestedStatus}' is not allowed` },
          { status: 400 }
        );
      }
    }

    if (!hasFieldUpdates && requestedStatus === undefined) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const shouldCleanupRootFile =
      updatePayload.fileUrl !== undefined &&
      normalizeStorageValue(currentContent.fileUrl) !== normalizeStorageValue(updatePayload.fileUrl);

    const updatedContent = await db.transaction(async (tx: any) => {
      const rows = await tx.update(mentorContent)
        .set(updatePayload)
        .where(and(
          eq(mentorContent.id, id),
          ownershipCondition
        ))
        .returning();

      if (!rows.length) {
        return rows;
      }

      if (reviewAction && currentContent.mentorId) {
        await tx.insert(contentReviewAudit).values({
          contentId: id,
          mentorId: currentContent.mentorId,
          action: reviewAction,
          previousStatus: currentContent.status,
          newStatus: nextStatus,
          reviewedBy: null,
          note: null,
        });
      }

      return rows;
    });

    if (!updatedContent.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (shouldCleanupRootFile) {
      await deleteStorageValues([currentContent.fileUrl]);
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
    const session = guard.session;
    if (!session?.user) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }
    const isAdmin = guard.user.roles.some((role: any) => role.name === 'admin');

    const { id } = await params;

    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    const ownershipCondition = getMentorContentOwnershipCondition(mentor?.id ?? null, isAdmin);
    if (!ownershipCondition) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const existingContent = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        ownershipCondition
      ))
      .limit(1);

    if (!existingContent.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const content = existingContent[0];
    if (content.deletedAt) {
      return NextResponse.json({ message: 'Content is already deleted' });
    }

    const now = new Date();
    const purgeAfter = new Date(now.getTime() + PURGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx: any) => {
      await tx.update(mentorContent)
        .set({
          status: 'ARCHIVED',
          statusBeforeArchive: content.status === 'ARCHIVED'
            ? (content.statusBeforeArchive || 'DRAFT')
            : content.status,
          requireReviewAfterRestore: true,
          deletedAt: now,
          deletedBy: session.user.id,
          deleteReason: isAdmin ? 'Deleted by admin' : 'Deleted by mentor',
          purgeAfterAt: purgeAfter,
          updatedAt: now,
        })
        .where(eq(mentorContent.id, id));

      if (content.mentorId) {
        await tx.insert(contentReviewAudit).values({
          contentId: id,
          mentorId: content.mentorId,
          action: 'ARCHIVED',
          previousStatus: content.status,
          newStatus: 'ARCHIVED',
          reviewedBy: null,
          note: isAdmin
            ? 'Soft deleted by admin via delete endpoint'
            : 'Soft deleted by mentor via delete endpoint',
        });
      }
    });

    return NextResponse.json({
      message: 'Content deleted successfully. It is retained for 30 days before permanent purge.',
      purgeAfterAt: purgeAfter.toISOString(),
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
