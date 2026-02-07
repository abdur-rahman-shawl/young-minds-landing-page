import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMentorRecentSessions } from '@/lib/db/queries/mentor-dashboard-stats';
import { requireMentor } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    const recentSessions = await getMentorRecentSessions(guard.session.user.id, limit);

    return NextResponse.json({
      sessions: recentSessions,
      count: recentSessions.length,
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent sessions' },
      { status: 500 }
    );
  }
}
