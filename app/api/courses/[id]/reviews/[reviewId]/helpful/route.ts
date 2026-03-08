import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseReviewHelpfulVotes, courseReviews } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { requireSession } from '@/lib/api/guards';

interface RouteParams {
  params: Promise<{ id: string; reviewId: string }>;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/courses/[id]/reviews/[reviewId]/helpful - toggle helpful
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;

    if (!uuidRegex.test(reviewId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review id' },
        { status: 400 }
      );
    }

    const guard = await requireSession(request);
    if ('error' in guard) {
      return guard.error;
    }

    const session = guard.session;
    const userId = session.user.id;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ reviewId: courseReviewHelpfulVotes.reviewId })
        .from(courseReviewHelpfulVotes)
        .where(
          and(
            eq(courseReviewHelpfulVotes.reviewId, reviewId),
            eq(courseReviewHelpfulVotes.userId, userId)
          )
        )
        .limit(1);

      if (existing) {
        await tx
          .delete(courseReviewHelpfulVotes)
          .where(
            and(
              eq(courseReviewHelpfulVotes.reviewId, reviewId),
              eq(courseReviewHelpfulVotes.userId, userId)
            )
          );

        const [updated] = await tx
          .update(courseReviews)
          .set({ helpfulVotes: sql<number>`${courseReviews.helpfulVotes} - 1` })
          .where(eq(courseReviews.id, reviewId))
          .returning({ helpfulVotes: courseReviews.helpfulVotes });

        return { helpfulVotes: updated?.helpfulVotes ?? 0, viewerHasHelpful: false };
      }

      await tx.insert(courseReviewHelpfulVotes).values({
        reviewId,
        userId,
      });

      const [updated] = await tx
        .update(courseReviews)
        .set({ helpfulVotes: sql<number>`${courseReviews.helpfulVotes} + 1` })
        .where(eq(courseReviews.id, reviewId))
        .returning({ helpfulVotes: courseReviews.helpfulVotes });

      return { helpfulVotes: updated?.helpfulVotes ?? 1, viewerHasHelpful: true };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to toggle helpful vote:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update helpful vote' },
      { status: 500 }
    );
  }
}
