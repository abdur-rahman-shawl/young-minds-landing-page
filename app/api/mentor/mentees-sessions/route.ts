import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMentorMenteesFromSessions, getMentorSessionStats } from '@/lib/db/queries/mentor-sessions';
import { requireMentor } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const mentees = await getMentorMenteesFromSessions(guard.session.user.id);
    const stats = await getMentorSessionStats(guard.session.user.id);

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
