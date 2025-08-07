import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, mentors, users } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'upcoming', 'past', 'all'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

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
        mentorRating: sessions.mentorRating,
        menteeRating: sessions.menteeRating,
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
          eq(sessions.menteeId, userId),
          eq(sessions.mentorId, userId)
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
    const body = await request.json();
    const { 
      mentorId, 
      menteeId, 
      scheduledAt, 
      duration, 
      title,
      description,
      action 
    } = body;

    if (action === 'book') {
      if (!mentorId || !menteeId || !scheduledAt) {
        return NextResponse.json(
          { success: false, error: 'Mentor ID, Mentee ID, and scheduled time are required' },
          { status: 400 }
        );
      }

      // Create new session
      const [newSession] = await db
        .insert(sessions)
        .values({
          mentorId,
          menteeId,
          title: title || 'Mentoring Session',
          description: description || null,
          scheduledAt: new Date(scheduledAt),
          duration: duration || 60,
          status: 'scheduled',
        })
        .returning();

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