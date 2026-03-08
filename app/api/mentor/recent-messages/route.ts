import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMentorRecentMessages } from '@/lib/db/queries/mentor-dashboard-stats';
import { requireMentor } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    const recentMessages = await getMentorRecentMessages(guard.session.user.id, limit);

    return NextResponse.json({
      messages: recentMessages,
      count: recentMessages.length,
    });
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent messages' },
      { status: 500 }
    );
  }
}
