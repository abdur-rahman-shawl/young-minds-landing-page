import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // --- MODIFICATION: Using db.select() with aliases as requested ---

    // 1. Create aliases for the users table to join it twice
    const mentorUser = alias(users, 'mentor');
    const menteeUser = alias(users, 'mentee');

    // 2. Build the query with explicit joins
    const sessionArr = await db
      .select({
        id: sessions.id,
        mentorId: sessions.mentorId, // Keep these to determine the reviewee in the frontend
        menteeId: sessions.menteeId,
        mentor: {
          id: mentorUser.id,
          name: mentorUser.name,
          image: mentorUser.image,
        },
        mentee: {
          id: menteeUser.id,
          name: menteeUser.name,
          image: menteeUser.image,
        },
      })
      .from(sessions)
      .leftJoin(mentorUser, eq(sessions.mentorId, mentorUser.id))
      .leftJoin(menteeUser, eq(sessions.menteeId, menteeUser.id))
      .where(eq(sessions.id, sessionId));

    // 3. Handle the array result
    if (sessionArr.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const sessionData = sessionArr[0];
    
    // --- END MODIFICATION ---

    // The check for null mentor/mentee is important in case a user was deleted
    if (!sessionData.mentor || !sessionData.mentee) {
        return NextResponse.json({ error: 'Associated user for this session could not be found.' }, { status: 404 });
    }

    return NextResponse.json(sessionData, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}