import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviewQuestions, sessions } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

// Define a schema to validate the incoming query parameters
const querySchema = z.object({
  role: z.enum(['mentor', 'mentee'], {
    required_error: "'role' query parameter is required.",
    invalid_type_error: "Role must be either 'mentor' or 'mentee'.",
  }),
  sessionId: z.string({ required_error: "'sessionId' query parameter is required."}).uuid("Invalid sessionId format."),
});

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate the user
    const userSession = await auth.api.getSession({ headers: await headers() });
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = userSession.user.id;

    //const currentUserId = 'BPyy0bdbVjWhL1MlRUX7XwhovwJM9bUY';

    // 2. Get and validate the 'role' and 'sessionId' query parameters
    const { searchParams } = new URL(req.url);
    const params = {
      role: searchParams.get('role'),
      sessionId: searchParams.get('sessionId'),
    };
    const validatedParams = querySchema.parse(params);
    const { role: roleToReview, sessionId } = validatedParams;

    // 3. Fetch the session from the database to verify participation
    const sessionArr = await db
      .select({
        mentorId: sessions.mentorId,
        menteeId: sessions.menteeId,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (sessionArr.length === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    const session = sessionArr[0];

    // 4. Authorize the user based on their role in the session
    let isAuthorized = false;
    // If the user wants to review a 'mentor', they must be the 'mentee' of this session.
    if (roleToReview === 'mentor' && currentUserId === session.menteeId) {
      isAuthorized = true;
    }
    // If the user wants to review a 'mentee', they must be the 'mentor' of this session.
    if (roleToReview === 'mentee' && currentUserId === session.mentorId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'You are not authorized to get review questions for this session.' }, { status: 403 });
    }

    //const isAuthorized = true;
    // 5. If authorized, fetch the relevant questions
    const questions = await db
      .select({
        id: reviewQuestions.id,
        questionText: reviewQuestions.questionText,
        displayOrder: reviewQuestions.displayOrder,
      })
      .from(reviewQuestions)
      .where(and(
        eq(reviewQuestions.role, roleToReview),
        eq(reviewQuestions.isActive, 'true')
      ))
      .orderBy(asc(reviewQuestions.displayOrder));

    // 6. Return the list of questions
    return NextResponse.json(questions, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to fetch review questions:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}