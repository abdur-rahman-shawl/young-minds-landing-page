import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent } from '@/lib/db/schema';
import { z } from 'zod';
import { enforceFeature, isSubscriptionPolicyError } from '@/lib/subscriptions/policy-runtime';
import { requireMentor } from '@/lib/api/guards';
import { getMentorContentOwnershipCondition, getMentorForContent } from '@/lib/api/mentor-content';
import { normalizeStorageValue, resolveStorageUrl } from '@/lib/storage';

// Validation schemas
const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['COURSE', 'FILE', 'URL']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),

  // For FILE type
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),

  // For URL type
  url: z.string().url().optional(),
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
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    const mentor = await getMentorForContent(guard.session.user.id);
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
      createdAt: mentorContent.createdAt,
      updatedAt: mentorContent.updatedAt,
    })
      .from(mentorContent)
      .where(ownershipCondition)
      .orderBy(mentorContent.createdAt);

    const hydratedContent = await Promise.all(
      content.map(async (item) => ({
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
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    const mentor = await getMentorForContent(guard.session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    if (!isAdmin) {
      try {
        await enforceFeature({
          action: 'mentor.content_post',
          userId: guard.session.user.id,
        });
      } catch (error) {
        if (isSubscriptionPolicyError(error)) {
          return NextResponse.json(error.payload, { status: error.status });
        }
        throw error;
      }
    }

    const body = await request.json();
    const validatedData = createContentSchema.parse(body);

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
