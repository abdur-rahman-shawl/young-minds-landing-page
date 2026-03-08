import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMentorMentees, getMentorStats } from '@/lib/db/queries/mentoring-relationships';
import { requireMentor } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    const statusFilter = status ? status.split(',') : undefined;

    const mentees = await getMentorMentees(guard.session.user.id, statusFilter);

    const response: any = {
      mentees,
      count: mentees.length,
    };

    if (includeStats) {
      const stats = await getMentorStats(guard.session.user.id);
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
