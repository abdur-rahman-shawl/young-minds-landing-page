import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
// Import the schema tables directly
import { sessions, reviews, reviewQuestions, reviewRatings, ReviewQuestion } from '@/lib/db/schema';
import * as schema from '@/lib/db/schema'; // Keep for transaction typing
import { and, eq, inArray } from 'drizzle-orm';
import { NodePgTransaction } from 'drizzle-orm/node-postgres';
import { z } from 'zod';

const createReviewSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID."),
  feedback: z.string().optional(),
  ratings: z.array(z.object({
    questionId: z.string().uuid("Invalid question ID."),
    rating: z.number().min(1, "Rating must be between 1 and 5.").max(5, "Rating must be between 1 and 5."),
  })).min(1, "At least one rating is required."),
});


export async function POST(req: NextRequest) {
  try {
   /* const userSession = await auth.api.getSession({ headers: await headers() });
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const reviewerId = userSession.user.id;*/
    const reviewerId = 'wlZdojeEuxSE8tafVv7VC7YjUyra4wjX';

    const body = await req.json();
    const validatedData = createReviewSchema.parse(body);
    const { sessionId, feedback, ratings } = validatedData;

    // --- MODIFICATION: Using db.select() as requested ---
    const sessionArr = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (sessionArr.length === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    const session = sessionArr[0];
    // --- END MODIFICATION ---

    let revieweeId: string;
    let reviewerRole: 'mentor' | 'mentee';
    let revieweeRole: 'mentor' | 'mentee';

    if (session.menteeId === reviewerId) {
      reviewerRole = 'mentee';
      revieweeRole = 'mentor';
      revieweeId = session.mentorId;
    } else if (session.mentorId === reviewerId) {
      reviewerRole = 'mentor';
      revieweeRole = 'mentee';
      revieweeId = session.menteeId;
    } else {
      return NextResponse.json({ error: 'You were not a participant in this session.' }, { status: 403 });
    }
    
    // This query can also be written in the db.select() style if you prefer
    const existingReviewArr = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(
        eq(reviews.sessionId, sessionId),
        eq(reviews.reviewerId, reviewerId)
      ));

    if (existingReviewArr.length > 0) {
      return NextResponse.json({ error: 'You have already submitted a review for this session.' }, { status: 409 });
    }

    const questionIds = ratings.map(r => r.questionId);
    
    const questionsForRole = await db
      .select()
      .from(reviewQuestions)
      .where(and(
        eq(reviewQuestions.role, revieweeRole),
        inArray(reviewQuestions.id, questionIds)
      ));

    const questionWeightMap: Map<string, number> = new Map(
      questionsForRole.map((q: ReviewQuestion) => [q.id, parseFloat(q.weight)])
    );

    let finalScore = 0;
    for (const r of ratings) {
      const weight = questionWeightMap.get(r.questionId);
      if (weight === undefined) {
        return NextResponse.json({ error: `Invalid question ID ${r.questionId} for this review type.` }, { status: 400 });
      }
      finalScore += r.rating * weight;
    }

    const [insertedReview] = await db.transaction(async (tx: NodePgTransaction<typeof schema, Record<string, never>>) => {
      const newReview = await tx.insert(reviews).values({
        sessionId,
        reviewerId,
        revieweeId,
        reviewerRole,
        finalScore: finalScore.toFixed(2),
        feedback,
      }).returning({ id: reviews.id });

      const reviewId = newReview[0].id;

      const ratingsToInsert = ratings.map(r => ({
        reviewId,
        questionId: r.questionId,
        rating: r.rating,
      }));

      await tx.insert(reviewRatings).values(ratingsToInsert);

      return newReview;
    });

    return NextResponse.json({ success: true, reviewId: insertedReview.id, finalScore }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Review creation error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Failed to create review.' }, { status: 500 });
  }
}