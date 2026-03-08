import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  courseEnrollments,
  courseReviews,
  courseReviewHelpfulVotes,
  mentees,
  users,
} from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { requireMentee } from '@/lib/api/guards';
import { rateLimit, RateLimitError } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

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
  params: Promise<{ id: string }>;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/courses/[id]/reviews
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;

    if (!uuidRegex.test(courseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course id' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '10')));
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'));
    const includeMine = searchParams.get('includeMine') === 'true';

    const session = await auth.api.getSession({ headers: request.headers });
    const viewerId = session?.user?.id || null;

    const rows = await db
      .select({
        id: courseReviews.id,
        rating: courseReviews.rating,
        title: courseReviews.title,
        review: courseReviews.review,
        createdAt: courseReviews.createdAt,
        helpfulVotes: courseReviews.helpfulVotes,
        instructorResponse: courseReviews.instructorResponse,
        instructorRespondedAt: courseReviews.instructorRespondedAt,
        reviewerName: users.name,
        reviewerImage: users.image,
        viewerHasHelpful: sql<boolean>`CASE WHEN ${courseReviewHelpfulVotes.userId} IS NULL THEN false ELSE true END`,
      })
      .from(courseReviews)
      .innerJoin(mentees, eq(courseReviews.menteeId, mentees.id))
      .innerJoin(users, eq(mentees.userId, users.id))
      .leftJoin(
        courseReviewHelpfulVotes,
        and(
          eq(courseReviewHelpfulVotes.reviewId, courseReviews.id),
          viewerId ? eq(courseReviewHelpfulVotes.userId, viewerId) : sql<boolean>`false`
        )
      )
      .where(and(eq(courseReviews.courseId, courseId), eq(courseReviews.isPublished, true)))
      .orderBy(desc(courseReviews.createdAt))
      .limit(limit)
      .offset(offset);

    let myReview = null;
    if (includeMine && viewerId) {
      const [mentee] = await db
        .select({ id: mentees.id })
        .from(mentees)
        .where(eq(mentees.userId, viewerId))
        .limit(1);

      if (mentee) {
        const [review] = await db
          .select({
            id: courseReviews.id,
            rating: courseReviews.rating,
            title: courseReviews.title,
            review: courseReviews.review,
            createdAt: courseReviews.createdAt,
            helpfulVotes: courseReviews.helpfulVotes,
            instructorResponse: courseReviews.instructorResponse,
            instructorRespondedAt: courseReviews.instructorRespondedAt,
          })
          .from(courseReviews)
          .where(
            and(
              eq(courseReviews.courseId, courseId),
              eq(courseReviews.menteeId, mentee.id)
            )
          )
          .limit(1);
        if (review) myReview = review;
      }
    }

    return NextResponse.json({
      success: true,
      data: rows,
      myReview,
      pagination: {
        limit,
        offset,
        hasMore: rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch course reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/reviews
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    reviewRateLimit.check(request);
    const { id: courseId } = await params;

    if (!uuidRegex.test(courseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course id' },
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
        { success: false, error: 'Enrollment required to review this course' },
        { status: 403 }
      );
    }

    if (!['ACTIVE', 'COMPLETED'].includes(enrollment.status)) {
      return NextResponse.json(
        { success: false, error: 'Enrollment is not active' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rating, title, review } = reviewSchema.parse(body);

    const [existing] = await db
      .select({ id: courseReviews.id })
      .from(courseReviews)
      .where(
        and(
          eq(courseReviews.courseId, courseId),
          eq(courseReviews.enrollmentId, enrollment.id),
          eq(courseReviews.menteeId, mentee.id)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(courseReviews)
        .set({
          rating,
          title: title?.trim() || null,
          review: review?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(courseReviews.id, existing.id))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    const [created] = await db
      .insert(courseReviews)
      .values({
        courseId,
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

    console.error('Failed to create course review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
