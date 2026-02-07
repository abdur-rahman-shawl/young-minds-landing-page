import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, mentors, users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess, trackFeatureUsage } from '@/lib/subscriptions/enforcement';

const SESSION_DURATION_LIMITS = {
  FREE: 30,
  PAID: 45,
  COUNSELING: 45,
} as const;

type SessionBookingType = keyof typeof SESSION_DURATION_LIMITS;

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
      action,
      sessionType
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

      const resolvedSessionType = (sessionType || 'PAID') as SessionBookingType;
      const sessionDuration = duration ?? 60;
      const sessionDurationLimit = SESSION_DURATION_LIMITS[resolvedSessionType];

      if (sessionDuration > sessionDurationLimit) {
        return NextResponse.json(
          { success: false, error: `Session duration cannot exceed ${sessionDurationLimit} minutes` },
          { status: 403 }
        );
      }

      const menteeSessionFeatureKey =
        resolvedSessionType === 'FREE'
          ? FEATURE_KEYS.FREE_VIDEO_SESSIONS_MONTHLY
          : resolvedSessionType === 'COUNSELING'
            ? FEATURE_KEYS.COUNSELING_SESSIONS_MONTHLY
            : FEATURE_KEYS.PAID_VIDEO_SESSIONS_MONTHLY;

      const mentorSessionFeatureKey =
        resolvedSessionType === 'FREE'
          ? FEATURE_KEYS.FREE_VIDEO_SESSIONS_MONTHLY
          : FEATURE_KEYS.PAID_VIDEO_SESSIONS_MONTHLY;

      try {
        const { has_access, reason } = await checkFeatureAccess(
          currentUserId,
          menteeSessionFeatureKey
        );

        if (!has_access) {
          return NextResponse.json(
            { success: false, error: reason || 'You have reached your session limit for this type' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Subscription check failed (mentee):', error);
        return NextResponse.json(
          { success: false, error: 'Unable to verify mentee subscription limits' },
          { status: 500 }
        );
      }

      try {
        const { has_access, reason } = await checkFeatureAccess(
          mentorId,
          mentorSessionFeatureKey
        );

        if (!has_access) {
          return NextResponse.json(
            { success: false, error: reason || 'Mentor has reached their session limit for this tier' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Subscription check failed (mentor):', error);
        return NextResponse.json(
          { success: false, error: 'Unable to verify mentor subscription limits' },
          { status: 500 }
        );
      }

      // Create new session
      const [newSession] = await db
        .insert(sessions)
        .values({
          mentorId,
          menteeId: currentUserId,
          title: title || 'Mentoring Session',
          description: description || null,
          sessionType: resolvedSessionType,
          scheduledAt: new Date(scheduledAt),
          duration: sessionDuration,
          status: 'scheduled',
        })
        .returning();

      try {
        await trackFeatureUsage(
          currentUserId,
          menteeSessionFeatureKey,
          { count: 1, minutes: sessionDuration },
          'session',
          newSession.id
        );

        await trackFeatureUsage(
          mentorId,
          mentorSessionFeatureKey,
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
