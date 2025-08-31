import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviews, sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createReviewSchema = z.object({
  sessionId: z.string().uuid(),
  revieweeId: z.string(),
  rating: z.number().min(0).max(5), // Allow 0 for skipped
  comment: z.string().optional(),
  reviewerRole: z.enum(['mentor', 'mentee']),
});

export async function POST(req: NextRequest) {
  try {
    const userSession = await auth.api.getSession({ headers: await headers() });
    if (!userSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createReviewSchema.parse(body);

    // Verify that the reviewer was part of the session
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, validatedData.sessionId),
    });

    if (!session || (session.menteeId !== userSession.user.id && session.mentorId !== userSession.user.id)) {
      return NextResponse.json({ error: 'Session not found or you were not a participant.' }, { status: 404 });
    }

    const newReview = {
      ...validatedData,
      reviewerId: userSession.user.id,
    };

    const [insertedReview] = await db.insert(reviews).values(newReview).returning();

    return NextResponse.json({ success: true, review: insertedReview }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Review creation error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
