import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  contentItemReviews,
  courseEnrollments,
  courseProgress,
  courses,
  courseModules,
  courseSections,
  sectionContentItems,
  mentees,
  users,
} from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { requireMentee } from '@/lib/api/guards';
import { rateLimit, RateLimitError } from '@/lib/rate-limit';

const reviewRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  review: z.string().max(2000).optional(),
}).refine(
  (data) => Boolean((data.title && data.title.trim()) || (data.review && data.review.trim())),
  { message: 'Review title or text is required.' }
);

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ensureContentItemInCourse(courseId: string, itemId: string) {
  const existing = await db
    .select({ id: sectionContentItems.id })
    .from(sectionContentItems)
    .innerJoin(courseSections, eq(sectionContentItems.sectionId, courseSections.id))
    .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(sectionContentItems.id, itemId), eq(courses.id, courseId)))
    .limit(1);

  return existing.length > 0;
}

// GET /api/courses/[id]/content-items/[itemId]/reviews
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId, itemId } = await params;

    if (!uuidRegex.test(courseId) || !uuidRegex.test(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course or item id' },
        { status: 400 }
      );
    }

    const inCourse = await ensureContentItemInCourse(courseId, itemId);
    if (!inCourse) {
      return NextResponse.json(
        { success: false, error: 'Content item not found for this course' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '10')));
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'));

    const rows = await db
      .select({
        id: contentItemReviews.id,
        rating: contentItemReviews.rating,
        title: contentItemReviews.title,
        review: contentItemReviews.review,
        createdAt: contentItemReviews.createdAt,
        helpfulVotes: contentItemReviews.helpfulVotes,
        instructorResponse: contentItemReviews.instructorResponse,
        instructorRespondedAt: contentItemReviews.instructorRespondedAt,
        reviewerName: users.name,
        reviewerImage: users.image,
      })
      .from(contentItemReviews)
      .innerJoin(mentees, eq(contentItemReviews.menteeId, mentees.id))
      .innerJoin(users, eq(mentees.userId, users.id))
      .where(
        and(
          eq(contentItemReviews.courseId, courseId),
          eq(contentItemReviews.contentItemId, itemId),
          eq(contentItemReviews.isPublished, true)
        )
      )
      .orderBy(desc(contentItemReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        limit,
        offset,
        hasMore: rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch content item reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/content-items/[itemId]/reviews
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    reviewRateLimit.check(request);
    const { id: courseId, itemId } = await params;

    if (!uuidRegex.test(courseId) || !uuidRegex.test(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course or item id' },
        { status: 400 }
      );
    }

    const guard = await requireMentee(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const session = guard.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const inCourse = await ensureContentItemInCourse(courseId, itemId);
    if (!inCourse) {
      return NextResponse.json(
        { success: false, error: 'Content item not found for this course' },
        { status: 404 }
      );
    }

    const [mentee] = await db
      .select({ id: mentees.id })
      .from(mentees)
      .where(eq(mentees.userId, session.user.id))
      .limit(1);

    if (!mentee) {
      return NextResponse.json(
        { success: false, error: 'Mentee profile not found' },
        { status: 403 }
      );
    }

    const [enrollment] = await db
      .select({
        id: courseEnrollments.id,
        status: courseEnrollments.status,
      })
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.menteeId, mentee.id)
        )
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment required to review content' },
        { status: 403 }
      );
    }

    if (!['ACTIVE', 'COMPLETED'].includes(enrollment.status)) {
      return NextResponse.json(
        { success: false, error: 'Enrollment is not active' },
        { status: 403 }
      );
    }

    const [progress] = await db
      .select({ status: courseProgress.status })
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.enrollmentId, enrollment.id),
          eq(courseProgress.contentItemId, itemId)
        )
      )
      .limit(1);

    if (!progress || progress.status === 'NOT_STARTED') {
      return NextResponse.json(
        { success: false, error: 'You must start this item before reviewing it' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rating, title, review } = reviewSchema.parse(body);

    const [created] = await db
      .insert(contentItemReviews)
      .values({
        courseId,
        contentItemId: itemId,
        menteeId: mentee.id,
        enrollmentId: enrollment.id,
        rating,
        title: title?.trim() || null,
        review: review?.trim() || null,
        isVerifiedPurchase: true,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode, headers: { 'Retry-After': error.retryAfter.toString() } }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid review data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to create content item review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
