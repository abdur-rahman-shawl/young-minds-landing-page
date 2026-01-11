import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, mentors, users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess, trackFeatureUsage } from '@/lib/subscriptions/enforcement';

async function requireSessionUser(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  return session?.user?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await requireSessionUser(request);
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'upcoming', 'past', 'all'

    // Fetch user's sessions (as mentee or mentor)
    const rawSessions = await db
      .select({
        id: sessions.id,
        mentorId: sessions.mentorId,
        menteeId: sessions.menteeId,
        title: sessions.title,
        description: sessions.description,
        scheduledAt: sessions.scheduledAt,
        duration: sessions.duration,
        status: sessions.status,
        meetingType: sessions.meetingType,
        // Mentor info
        mentorName: users.name,
        mentorTitle: mentors.title,
        mentorCompany: mentors.company,
      })
      .from(sessions)
      .leftJoin(mentors, eq(sessions.mentorId, mentors.userId))
      .leftJoin(users, eq(mentors.userId, users.id))
      .where(
        or(
          eq(sessions.menteeId, currentUserId),
          eq(sessions.mentorId, currentUserId)
        )
      )
      .orderBy(sessions.scheduledAt);

    const userSessions = rawSessions ?? [] as typeof rawSessions;

    // Filter by type if specified
    let filteredSessions = userSessions;
    if (type === 'upcoming') {
      const now = new Date();
      filteredSessions = userSessions.filter(s => 
        s.scheduledAt && new Date(s.scheduledAt) > now
      );
    } else if (type === 'past') {
      const now = new Date();
      filteredSessions = userSessions.filter(s => 
        s.scheduledAt && new Date(s.scheduledAt) <= now
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredSessions
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await requireSessionUser(request);
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      mentorId, 
      scheduledAt, 
      duration, 
      title,
      description,
      action 
    } = body;

    if (action === 'book') {
      if (!mentorId || !scheduledAt) {
        return NextResponse.json(
          { success: false, error: 'Mentor ID and scheduled time are required' },
          { status: 400 }
        );
      }

      if (mentorId === currentUserId) {
        return NextResponse.json(
          { success: false, error: 'You cannot book a session with yourself' },
          { status: 400 }
        );
      }

      try {
        const { has_access, reason } = await checkFeatureAccess(
          mentorId,
          FEATURE_KEYS.MENTOR_SESSIONS_MONTHLY
        );

        if (!has_access) {
          return NextResponse.json(
            { success: false, error: reason || 'Mentor has reached their monthly session limit' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Subscription check failed:', error);
        return NextResponse.json(
          { success: false, error: 'Unable to verify mentor subscription limits' },
          { status: 500 }
        );
      }

      const sessionDuration = duration || 60;

      // Create new session
      const [newSession] = await db
        .insert(sessions)
        .values({
          mentorId,
          menteeId: currentUserId,
          title: title || 'Mentoring Session',
          description: description || null,
          scheduledAt: new Date(scheduledAt),
          duration: sessionDuration,
          status: 'scheduled',
        })
        .returning();

      try {
        await trackFeatureUsage(
          mentorId,
          FEATURE_KEYS.MENTOR_SESSIONS_MONTHLY,
          { count: 1, minutes: sessionDuration },
          'session',
          newSession.id
        );
      } catch (error) {
        console.error('Usage tracking failed:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to track session usage' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: newSession,
        message: 'Session booked successfully'
      });
    }

    if (action === 'cancel') {
      const { sessionId } = body;
      
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Session ID is required' },
          { status: 400 }
        );
      }

      const sessionRecord = await db
        .select({
          id: sessions.id,
          mentorId: sessions.mentorId,
          menteeId: sessions.menteeId,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (!sessionRecord.length) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      const ownsSession = [sessionRecord[0].mentorId, sessionRecord[0].menteeId].includes(currentUserId);
      if (!ownsSession) {
        return NextResponse.json(
          { success: false, error: 'You are not authorized to cancel this session' },
          { status: 403 }
        );
      }

      // Update session status
      const [updatedSession] = await db
        .update(sessions)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      return NextResponse.json({
        success: true,
        data: updatedSession,
        message: 'Session cancelled successfully'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error managing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage session' },
      { status: 500 }
    );
  }
} 
