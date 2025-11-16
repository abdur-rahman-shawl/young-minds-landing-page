import { NextResponse } from 'next/server';
import {
  getMentorDashboardStats,
  getMentorEarningsOverTime,
  getMentorRecentSessions,
  getMentorRecentReviews,
} from '@/lib/db/queries/analytics.queries';
import { auth } from '@/lib/auth'; // Placeholder for your authentication utility
import { headers } from 'next/headers';

/**
 * API Endpoint for the Mentor Analytics Dashboard.
 *
 * This endpoint is secure and fetches data scoped to the currently
 * authenticated mentor.
 */
export async function GET(request: Request) {
  try {
    // STEP 1: Securely get the authenticated user's session.
    // This is a critical security step. The mentorId is derived from the
    // server-side session, not from a client-side parameter.
    const session = await auth.api.getSession({
          headers: await headers(),
        }); // Replace with your actual session logic (e.g., from NextAuth.js)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const mentorId = session.user.id;

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