import { NextRequest, NextResponse } from 'next/server';
import {
  getMentorDashboardStats,
  getMentorEarningsOverTime,
  getMentorRecentSessions,
  getMentorRecentReviews,
} from '@/lib/db/queries/analytics.queries';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';
import { requireMentor } from '@/lib/api/guards';

/**
 * API Endpoint for the Mentor Analytics Dashboard.
 *
 * This endpoint is secure and fetches data scoped to the currently
 * authenticated mentor.
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const mentorId = guard.session.user.id;

    const access = await checkFeatureAccess(mentorId, FEATURE_KEYS.ANALYTICS_ACCESS_LEVEL);
    if (!access.has_access) {
      return NextResponse.json(
        { message: access.reason || 'Analytics access not included in your plan', upgrade_required: true },
        { status: 403 }
      );
    }

    // STEP 2: Get date range from query parameters, with defaults.
    const { searchParams } = new URL(request.url);
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());
    // Default to a 90-day window for earnings chart
    const startDate = new Date(searchParams.get('startDate') || new Date(new Date().setDate(endDate.getDate() - 89)).toISOString());

    // STEP 3: Fetch all required data concurrently for performance.
    const [
      kpiData,
      earningsData,
      upcomingSessionsData,
      recentReviewsData
    ] = await Promise.all([
      getMentorDashboardStats(mentorId, startDate, endDate),
      getMentorEarningsOverTime(mentorId, startDate, endDate),
      getMentorRecentSessions(mentorId, 5), // Fetch top 5 upcoming
      getMentorRecentReviews(mentorId, 5),   // Fetch top 5 recent
    ]);

    // STEP 4: Assemble the final JSON response payload.
    const responsePayload = {
      kpis: {
        totalCompletedSessions: kpiData.completedSessions,
        totalEarnings: kpiData.totalEarnings,
        periodEarnings: kpiData.periodEarnings, // Earnings within the selected date range
        averageRating: kpiData.averageRating,
        unreadMessages: kpiData.unreadMessages,
      },
      earningsOverTime: earningsData,
      upcomingSessions: upcomingSessionsData.map((session: { id: any; mentee: { name: any; }; title: any; scheduledAt: any; }) => ({
        sessionId: session.id,
        menteeName: session.mentee?.name || 'Unknown Mentee',
        title: session.title,
        scheduledAt: session.scheduledAt,
      })),
      recentReviews: recentReviewsData.map((review: { reviewId: any; menteeName: any; rating: any; feedback: any; }) => ({
        reviewId: review.reviewId,
        menteeName: review.menteeName || 'Anonymous',
        rating: review.rating,
        feedback: review.feedback,
      })),
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error fetching mentor analytics:', error);
    // Return a generic error message to the client
    return NextResponse.json(
      { message: 'An internal server error occurred while fetching your analytics.' },
      { status: 500 }
    );
  }
}
