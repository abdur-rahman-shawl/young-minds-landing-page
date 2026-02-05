import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminDashboardKpis,
  getAdminSessionsOverTime,
  getAdminMentorLeaderboard,
  getTopMenteeQuestions,
  getTopUniversitiesSearched,
} from '@/lib/db/queries/analytics.queries';
import { requireAdmin } from '@/lib/api/guards';

// Helper to calculate percentage change
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
};

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const { searchParams } = new URL(request.url);
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());
    const startDate = new Date(searchParams.get('startDate') || new Date(new Date().setDate(endDate.getDate() - 29)).toISOString());
    
    const [kpiData, sessionsData, mentorData, topQuestions, topUniversities] = await Promise.all([
      getAdminDashboardKpis(startDate, endDate),
      getAdminSessionsOverTime(startDate, endDate),
      getAdminMentorLeaderboard(5),
      getTopMenteeQuestions(startDate, endDate, 5),
      getTopUniversitiesSearched(startDate, endDate, 5),
    ]);

    const responsePayload = {
      kpis: {
        activeMentees: {
          current: kpiData.activeMentees.current,
          previous: kpiData.activeMentees.previous,
          change: calculateChange(kpiData.activeMentees.current, kpiData.activeMentees.previous),
        },
        totalSessions: {
          current: kpiData.totalSessions.current,
          previous: kpiData.totalSessions.previous,
          change: calculateChange(kpiData.totalSessions.current, kpiData.totalSessions.previous),
        },
        paidConversionRate: kpiData.paidConversionRate,
        averageSessionRating: kpiData.averageSessionRating,
      },
      sessionsOverTime: sessionsData,
      mentorLeaderboard: mentorData.map((m: { averageRating: number; }) => ({
        ...m,
        averageRating: m.averageRating ? parseFloat(m.averageRating.toFixed(1)) : 0
      })),

      topMenteeQuestions: topQuestions,
      topUniversities,
      courseInsights: [
        { name: 'MS Computer Science', avgDuration: '2 yrs', avgFees: '$25k-$45k', interestPercentage: 38 },
      ],
      conversionFunnell: {
        visitors: 42000,
        signups: 5200,
        freeSessions: 1850,
        paidSessions: Math.round((kpiData.paidConversionRate / 100) * kpiData.totalSessions.current),
      },
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
