import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMentorMentees, getMentorStats } from '@/lib/db/queries/mentoring-relationships';

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
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    const statusFilter = status ? status.split(',') : undefined;

    const mentees = await getMentorMentees(session.user.id, statusFilter);

    const response: any = {
      mentees,
      count: mentees.length,
    };

    if (includeStats) {
      const stats = await getMentorStats(session.user.id);
      response.stats = stats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching mentees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentees' },
      { status: 500 }
    );
  }
}