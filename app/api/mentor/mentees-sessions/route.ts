import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMentorMenteesFromSessions, getMentorSessionStats } from '@/lib/db/queries/mentor-sessions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const mentees = await getMentorMenteesFromSessions(session.user.id);
    const stats = await getMentorSessionStats(session.user.id);

    return NextResponse.json({
      mentees,
      stats,
      count: mentees.length,
    });
  } catch (error) {
    console.error('Error fetching mentees sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentees' },
      { status: 500 }
    );
  }
}