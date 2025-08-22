import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, mentoringRelationships } from '@/lib/db/schema';
import { and, eq, gte, lte, sql, or, ne } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = new Date();
    
    // Calculate date ranges
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Get all sessions for the user
    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.menteeId, userId));

    // Get sessions from last month
    const lastMonthSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.menteeId, userId),
          gte(sessions.scheduledAt, lastMonth),
          lte(sessions.scheduledAt, now)
        )
      );

    // Get sessions from last week
    const lastWeekSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.menteeId, userId),
          gte(sessions.scheduledAt, lastWeek),
          lte(sessions.scheduledAt, now)
        )
      );

    // Get sessions from current month
    const currentMonthSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.menteeId, userId),
          gte(sessions.scheduledAt, startOfCurrentMonth)
        )
      );

    // Get sessions from previous month
    const previousMonthSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.menteeId, userId),
          gte(sessions.scheduledAt, startOfLastMonth),
          lte(sessions.scheduledAt, startOfCurrentMonth)
        )
      );

    // Calculate total hours learned
    const totalHours = allSessions.reduce((sum, session) => {
      return sum + (session.duration || 60); // Default to 60 minutes if duration not set
    }, 0) / 60; // Convert minutes to hours

    // Calculate hours from last week
    const lastWeekHours = lastWeekSessions.reduce((sum, session) => {
      return sum + (session.duration || 60);
    }, 0) / 60;

    // Calculate hours from last month
    const lastMonthHours = lastMonthSessions.reduce((sum, session) => {
      return sum + (session.duration || 60);
    }, 0) / 60;

    // Get unique mentors connected (from sessions)
    const uniqueMentorIds = [...new Set(allSessions.map(s => s.mentorId))];
    const mentorsConnectedCount = uniqueMentorIds.length;

    // Get active mentoring relationships
    const activeMentoringRelationships = await db
      .select()
      .from(mentoringRelationships)
      .where(
        and(
          eq(mentoringRelationships.menteeId, userId),
          or(
            eq(mentoringRelationships.status, 'active'),
            eq(mentoringRelationships.status, 'pending')
          )
        )
      );

    // Combine unique mentors from sessions and relationships
    const relationshipMentorIds = activeMentoringRelationships.map(r => r.mentorId);
    const allUniqueMentorIds = [...new Set([...uniqueMentorIds, ...relationshipMentorIds])];
    const totalMentorsConnected = allUniqueMentorIds.length;

    // Calculate growth metrics
    const sessionGrowth = currentMonthSessions.length - previousMonthSessions.length;
    const sessionGrowthText = sessionGrowth >= 0 
      ? `+${sessionGrowth} from last month` 
      : `${sessionGrowth} from last month`;

    const hoursGrowthWeek = lastWeekHours;
    const hoursGrowthText = hoursGrowthWeek > 0 
      ? `+${hoursGrowthWeek.toFixed(1)} hours this week`
      : 'No sessions this week';

    // Count new mentors this month
    const currentMonthMentorIds = [...new Set(currentMonthSessions.map(s => s.mentorId))];
    const previousMonthMentorIds = [...new Set(previousMonthSessions.map(s => s.mentorId))];
    const newMentors = currentMonthMentorIds.filter(id => !previousMonthMentorIds.includes(id)).length;
    const mentorGrowthText = newMentors > 0 
      ? `${newMentors} new connection${newMentors > 1 ? 's' : ''}`
      : 'No new connections';

    return NextResponse.json({
      stats: {
        sessionsBooked: {
          value: allSessions.length,
          description: sessionGrowthText,
          trend: sessionGrowth >= 0 ? 'up' : 'down'
        },
        hoursLearned: {
          value: totalHours.toFixed(1),
          description: hoursGrowthText,
          trend: hoursGrowthWeek > 0 ? 'up' : 'neutral'
        },
        mentorsConnected: {
          value: totalMentorsConnected,
          description: mentorGrowthText,
          trend: newMentors > 0 ? 'up' : 'neutral'
        }
      },
      summary: {
        totalSessions: allSessions.length,
        completedSessions: allSessions.filter(s => s.status === 'completed').length,
        upcomingSessions: allSessions.filter(s => 
          s.status === 'scheduled' && new Date(s.scheduledAt) > now
        ).length,
        totalHours: totalHours.toFixed(1),
        lastMonthSessions: lastMonthSessions.length,
        lastWeekSessions: lastWeekSessions.length
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}