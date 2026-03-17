import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent } from '@/lib/db/schema';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { requireMentor } from '@/lib/api/guards';
import { getMentorContentOwnershipCondition, getMentorForContent } from '@/lib/api/mentor-content';
import { normalizeStorageValue, resolveStorageUrl } from '@/lib/storage';
import { and, isNull } from 'drizzle-orm';

// Feature flag: set to true to require an active subscription for content creation
const ENFORCE_CONTENT_SUBSCRIPTION = false;
// Validation schemas
const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['COURSE', 'FILE', 'URL']),

  // For FILE type
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),

  // For URL type
  url: z.string().optional(),
  urlTitle: z.string().optional(),
  urlDescription: z.string().optional(),
});

const updateContentSchema = createContentSchema.partial();

export async function GET(request: NextRequest) {
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
    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    const ownershipCondition = getMentorContentOwnershipCondition(mentor?.id ?? null, isAdmin);
    if (!ownershipCondition) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Get all content for this mentor
    const content = await db.select({
      id: mentorContent.id,
      title: mentorContent.title,
      description: mentorContent.description,
      type: mentorContent.type,
      status: mentorContent.status,
      fileUrl: mentorContent.fileUrl,
      fileName: mentorContent.fileName,
      fileSize: mentorContent.fileSize,
      mimeType: mentorContent.mimeType,
      url: mentorContent.url,
      urlTitle: mentorContent.urlTitle,
      urlDescription: mentorContent.urlDescription,
      submittedForReviewAt: mentorContent.submittedForReviewAt,
      reviewedAt: mentorContent.reviewedAt,
      reviewedBy: mentorContent.reviewedBy,
      reviewNote: mentorContent.reviewNote,
      statusBeforeArchive: mentorContent.statusBeforeArchive,
      requireReviewAfterRestore: mentorContent.requireReviewAfterRestore,
      deletedAt: mentorContent.deletedAt,
      deleteReason: mentorContent.deleteReason,
      purgeAfterAt: mentorContent.purgeAfterAt,
      createdAt: mentorContent.createdAt,
      updatedAt: mentorContent.updatedAt,
    })
      .from(mentorContent)
      .where(
        isAdmin
          ? ownershipCondition
          : and(ownershipCondition, isNull(mentorContent.deletedAt))
      )
      .orderBy(mentorContent.createdAt);

    const hydratedContent = await Promise.all(
      content.map(async (item: any) => ({
        ...item,
        fileUrl: await resolveStorageUrl(item.fileUrl),
      }))
    );

    return NextResponse.json(hydratedContent);
  } catch (error) {
    console.error('Error fetching mentor content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const mentor = await getMentorForContent(session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createContentSchema.parse(body);

    if (ENFORCE_CONTENT_SUBSCRIPTION && !isAdmin) {
      if (validatedData.type === 'COURSE') {
        const access = await checkFeatureAccess(
          session.user.id,
          FEATURE_KEYS.COURSES_ACCESS,
          { audience: 'mentor', actorRole: 'mentor' }
        );

        if (!access.has_access) {
          return NextResponse.json(
            {
              success: false,
              error: 'Courses are not included in your plan',
              details: access.reason,
              feature: FEATURE_KEYS.COURSES_ACCESS,
              limit: access.limit ?? null,
              usage: access.usage,
              remaining: access.remaining,
              upgrade_required: true,
            },
            { status: 403 }
          );
        }
      } else {
        const access = await checkFeatureAccess(
          session.user.id,
          'create_post_content',
          { audience: 'mentor', actorRole: 'mentor' }
        );

        if (!access.has_access) {
          return NextResponse.json(
            {
              success: false,
              error: 'Content publishing is not included in your plan',
              details: access.reason,
              feature: 'create_post_content',
              limit: access.limit ?? null,
              usage: access.usage,
              remaining: access.remaining,
              upgrade_required: true,
            },
            { status: 403 }
          );
        }
      }
    }

    // Admins can only create courses through this flow.
    if (isAdmin && validatedData.type !== 'COURSE') {
      return NextResponse.json({ error: 'Admins can only create courses' }, { status: 403 });
    }

    // Validate type-specific fields
    if (validatedData.type === 'FILE' && !validatedData.fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required for FILE type content' },
        { status: 400 }
      );
    }

    if (validatedData.type === 'URL' && !validatedData.url) {
      return NextResponse.json(
        { error: 'URL is required for URL type content' },
        { status: 400 }
      );
    }

    // Create content
    const newContent = await db.insert(mentorContent)
      .values({
        ...validatedData,
        status: 'DRAFT',
        fileUrl: normalizeStorageValue(validatedData.fileUrl),
        mentorId: isAdmin ? null : mentor?.id,
      })
      .returning();

    const hydratedContent = {
      ...newContent[0],
      fileUrl: await resolveStorageUrl(newContent[0].fileUrl),
    };

    return NextResponse.json(hydratedContent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating mentor content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
