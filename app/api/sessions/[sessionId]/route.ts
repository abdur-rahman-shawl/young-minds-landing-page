import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const mentorUser = alias(users, 'mentor');
    const menteeUser = alias(users, 'mentee');

    const sessionArr = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        mentorId: sessions.mentorId,
        menteeId: sessions.menteeId,
        meetingUrl: sessions.meetingUrl,
        meetingType: sessions.meetingType,
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

    if (sessionArr.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const sessionData = sessionArr[0];

    if (!sessionData.mentor || !sessionData.mentee) {
      return NextResponse.json({ error: 'Associated user for this session could not be found.' }, { status: 404 });
    }

    return NextResponse.json(sessionData, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}


