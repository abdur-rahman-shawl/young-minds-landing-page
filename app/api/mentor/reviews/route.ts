import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { requireMentor } from '@/lib/api/guards';
import { db } from '@/lib/db';
import { reviewRatings, reviewQuestions, reviews, sessions, users } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const mentorId = guard.session.user.id;
    const menteeUser = alias(users, 'mentee_user');

    const mentorReviews = await db
      .select({
        id: reviews.id,
        sessionId: reviews.sessionId,
        feedback: reviews.feedback,
        finalScore: reviews.finalScore,
        createdAt: reviews.createdAt,
        sessionTitle: sessions.title,
        sessionEndedAt: sessions.endedAt,
        mentee: {
          id: menteeUser.id,
          name: menteeUser.name,
          image: menteeUser.image,
        },
      })
      .from(reviews)
      .innerJoin(sessions, eq(reviews.sessionId, sessions.id))
      .leftJoin(menteeUser, eq(reviews.revieweeId, menteeUser.id))
      .where(
        and(
          eq(reviews.reviewerId, mentorId),
          eq(reviews.reviewerRole, 'mentor')
        )
      )
      .orderBy(desc(reviews.createdAt));

    const reviewIds = mentorReviews.map((review) => review.id);

    const ratings = reviewIds.length === 0
      ? []
      : await db
          .select({
            reviewId: reviewRatings.reviewId,
            rating: reviewRatings.rating,
            questionText: reviewQuestions.questionText,
          })
          .from(reviewRatings)
          .innerJoin(reviewQuestions, eq(reviewRatings.questionId, reviewQuestions.id))
          .innerJoin(reviews, eq(reviewRatings.reviewId, reviews.id))
          .where(
            and(
              eq(reviews.reviewerId, mentorId),
              eq(reviews.reviewerRole, 'mentor')
            )
          )
          .orderBy(asc(reviewQuestions.displayOrder));

    const ratingsByReviewId = new Map<string, Array<{ questionText: string; rating: number }>>();

    for (const rating of ratings) {
      const existing = ratingsByReviewId.get(rating.reviewId) ?? [];
      existing.push({
        questionText: rating.questionText,
        rating: rating.rating,
      });
      ratingsByReviewId.set(rating.reviewId, existing);
    }

    return NextResponse.json({
      reviews: mentorReviews.map((review) => ({
        ...review,
        ratings: ratingsByReviewId.get(review.id) ?? [],
      })),
    });
  } catch (error) {
    console.error('Failed to fetch mentor reviews:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching reviews.' },
      { status: 500 }
    );
  }
}
