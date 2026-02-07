import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, courses, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';
import { requireMentor } from '@/lib/api/guards';

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

    // Get mentor info
    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, guard.session.user.id))
      .limit(1);

    if (!mentor.length) {
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
    .where(eq(mentorContent.mentorId, mentor[0].id))
    .orderBy(mentorContent.createdAt);

    return NextResponse.json(content);
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

    // Get mentor info
    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, guard.session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const access = await checkFeatureAccess(
      guard.session.user.id,
      FEATURE_KEYS.CONTENT_POSTING_ACCESS
    );
    if (!access.has_access) {
      return NextResponse.json(
        { error: access.reason || 'Content publishing is not included in your plan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createContentSchema.parse(body);

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
        mentorId: mentor[0].id,
      })
      .returning();

    return NextResponse.json(newContent[0], { status: 201 });
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
