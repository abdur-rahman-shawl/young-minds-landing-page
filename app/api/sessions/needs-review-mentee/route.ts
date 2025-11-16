import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    console.log('*****Inside mentee needs review*********');
    // 1. Authenticate the user and ensure they are logged in
    const userSession = await auth.api.getSession({ headers: await headers() });
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = userSession.user.id;

    // 2. Fetch sessions that need review by the mentee
    const sessionsToReview = await db
      .select({
        // Select specific fields to return to the frontend
        sessionId: sessions.id,
        sessionTitle: sessions.title,
        sessionEndedAt: sessions.endedAt, // Use endedAt to show when the session was completed
        mentor: {
          id: users.id,
          name: users.name,
          avatar: users.image, // Assuming 'image' is the avatar column in the 'users' table
        },
      })
      .from(sessions)
      // Join with the users table to get the mentor's details
      .leftJoin(users, eq(sessions.mentorId, users.id))
      .where(
        // The query must satisfy all three conditions
        and(
          // a) The current user must be the mentee of the session
          eq(sessions.menteeId, currentUserId),
          // b) The session must be marked as completed
          //eq(sessions.status, 'completed'),
          // c) The session must NOT have been reviewed by the mentee yet
          eq(sessions.isReviewedByMentee, false)
        )
      )
      // Order by the most recently ended sessions first
      .orderBy(desc(sessions.endedAt));

    console.log('sessionsToReview: ', sessionsToReview);

    // 3. Return the list of sessions needing review
    return NextResponse.json({ success: true, data: sessionsToReview }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch sessions needing review for mentee:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}