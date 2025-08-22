import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { eq, and, desc, sql, or, gte } from 'drizzle-orm';

export interface MenteeFromSessions {
  menteeId: string;
  mentee: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    bio: string | null;
    timezone: string | null;
  };
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  lastSessionDate: Date | null;
  nextSessionDate: Date | null;
  firstSessionDate: Date | null;
}

export async function getMentorMenteesFromSessions(
  mentorId: string
): Promise<MenteeFromSessions[]> {
  try {
    // Get all unique mentees who have sessions with this mentor
    const menteesWithSessions = await db
      .select({
        menteeId: sessions.menteeId,
        mentee: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          bio: users.bio,
          timezone: users.timezone,
        },
        totalSessions: sql<number>`COUNT(${sessions.id})::int`,
        completedSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        upcomingSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= NOW() THEN 1 ELSE 0 END)::int`,
        cancelledSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'cancelled' THEN 1 ELSE 0 END)::int`,
        lastSessionDate: sql<Date | null>`MAX(CASE WHEN ${sessions.status} = 'completed' THEN ${sessions.endedAt} END)`,
        nextSessionDate: sql<Date | null>`MIN(CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= NOW() THEN ${sessions.scheduledAt} END)`,
        firstSessionDate: sql<Date | null>`MIN(${sessions.createdAt})`,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.menteeId, users.id))
      .where(eq(sessions.mentorId, mentorId))
      .groupBy(sessions.menteeId, users.id)
      .orderBy(desc(sql`COUNT(${sessions.id})`));

    return menteesWithSessions.map((row) => ({
      menteeId: row.menteeId,
      mentee: row.mentee || {
        id: row.menteeId,
        email: 'Unknown',
        name: null,
        image: null,
        firstName: null,
        lastName: null,
        phone: null,
        bio: null,
        timezone: null,
      },
      totalSessions: row.totalSessions || 0,
      completedSessions: row.completedSessions || 0,
      upcomingSessions: row.upcomingSessions || 0,
      cancelledSessions: row.cancelledSessions || 0,
      lastSessionDate: row.lastSessionDate,
      nextSessionDate: row.nextSessionDate,
      firstSessionDate: row.firstSessionDate,
    }));
  } catch (error) {
    console.error('Error fetching mentor mentees from sessions:', error);
    throw new Error('Failed to fetch mentees');
  }
}

export async function getMenteeSessionDetails(
  mentorId: string,
  menteeId: string
) {
  try {
    const menteesSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.mentorId, mentorId),
          eq(sessions.menteeId, menteeId)
        )
      )
      .orderBy(desc(sessions.scheduledAt));

    return menteesSessions;
  } catch (error) {
    console.error('Error fetching mentee session details:', error);
    return [];
  }
}

export async function getMentorSessionStats(mentorId: string) {
  try {
    const now = new Date();
    
    const stats = await db
      .select({
        totalMentees: sql<number>`COUNT(DISTINCT ${sessions.menteeId})::int`,
        totalSessions: sql<number>`COUNT(${sessions.id})::int`,
        completedSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        upcomingSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= ${now} THEN 1 ELSE 0 END)::int`,
        cancelledSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'cancelled' THEN 1 ELSE 0 END)::int`,
        activeMentees: sql<number>`COUNT(DISTINCT CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= ${now} THEN ${sessions.menteeId} END)::int`,
      })
      .from(sessions)
      .where(eq(sessions.mentorId, mentorId));

    return stats[0] || {
      totalMentees: 0,
      totalSessions: 0,
      completedSessions: 0,
      upcomingSessions: 0,
      cancelledSessions: 0,
      activeMentees: 0,
    };
  } catch (error) {
    console.error('Error fetching mentor session stats:', error);
    return {
      totalMentees: 0,
      totalSessions: 0,
      completedSessions: 0,
      upcomingSessions: 0,
      cancelledSessions: 0,
      activeMentees: 0,
    };
  }
}