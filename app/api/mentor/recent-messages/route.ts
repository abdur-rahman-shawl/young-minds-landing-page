import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMentorRecentMessages } from '@/lib/db/queries/mentor-dashboard-stats';

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    const recentMessages = await getMentorRecentMessages(session.user.id, limit);

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