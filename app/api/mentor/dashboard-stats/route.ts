import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMentorDashboardStats } from '@/lib/db/queries/mentor-dashboard-stats';
import { requireMentor } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const stats = await getMentorDashboardStats(guard.session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
