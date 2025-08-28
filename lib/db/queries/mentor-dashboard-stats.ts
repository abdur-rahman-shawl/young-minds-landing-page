import { db } from '@/lib/db';
import { sessions, users, reviews, messages } from '@/lib/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

export interface MentorDashboardStats {
  activeMentees: number;
  totalMentees: number;
  upcomingSessions: number;
  completedSessions: number;
  monthlyEarnings: number;
  totalEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  unreadMessages: number;
  totalMessages: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
}

export async function getMentorDashboardStats(mentorId: string): Promise<MentorDashboardStats> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Convert dates to ISO strings for SQL
    const nowStr = now.toISOString();
    const startOfMonthStr = startOfMonth.toISOString();
    const endOfMonthStr = endOfMonth.toISOString();
    const startOfLastMonthStr = startOfLastMonth.toISOString();
    const endOfLastMonthStr = endOfLastMonth.toISOString();

    // Get session statistics
    const sessionStats = await db
      .select({
        totalMentees: sql<number>`COUNT(DISTINCT ${sessions.menteeId})::int`,
        activeMentees: sql<number>`COUNT(DISTINCT CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= ${nowStr} THEN ${sessions.menteeId} END)::int`,
        upcomingSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= ${nowStr} THEN 1 ELSE 0 END)::int`,
        completedSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        monthlyEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.status} = 'completed' AND ${sessions.endedAt} >= ${startOfMonthStr} AND ${sessions.endedAt} <= ${endOfMonthStr} THEN ${sessions.rate} ELSE 0 END), 0)::decimal`,
        totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.status} = 'completed' THEN ${sessions.rate} ELSE 0 END), 0)::decimal`,
        sessionsThisMonth: sql<number>`SUM(CASE WHEN ${sessions.scheduledAt} >= ${startOfMonthStr} AND ${sessions.scheduledAt} <= ${endOfMonthStr} THEN 1 ELSE 0 END)::int`,
        sessionsLastMonth: sql<number>`SUM(CASE WHEN ${sessions.scheduledAt} >= ${startOfLastMonthStr} AND ${sessions.scheduledAt} <= ${endOfLastMonthStr} THEN 1 ELSE 0 END)::int`,
      })
      .from(sessions)
      .where(eq(sessions.mentorId, mentorId));

    // Get review statistics
    const reviewStats = await db
      .select({
        averageRating: sql<number>`AVG(${reviews.rating})::decimal(3,2)`,
        totalReviews: sql<number>`COUNT(${reviews.id})::int`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.revieweeId, mentorId),
          eq(reviews.reviewerRole, 'mentee')
        )
      );

    // Get message statistics
    const messageStats = await db
      .select({
        unreadMessages: sql<number>`SUM(CASE WHEN ${messages.isRead} = false THEN 1 ELSE 0 END)::int`,
        totalMessages: sql<number>`COUNT(${messages.id})::int`,
      })
      .from(messages)
      .where(eq(messages.receiverId, mentorId));

    return {
      activeMentees: sessionStats[0]?.activeMentees || 0,
      totalMentees: sessionStats[0]?.totalMentees || 0,
      upcomingSessions: sessionStats[0]?.upcomingSessions || 0,
      completedSessions: sessionStats[0]?.completedSessions || 0,
      monthlyEarnings: parseFloat(sessionStats[0]?.monthlyEarnings || '0'),
      totalEarnings: parseFloat(sessionStats[0]?.totalEarnings || '0'),
      averageRating: reviewStats[0]?.averageRating ? parseFloat(reviewStats[0].averageRating) : null,
      totalReviews: reviewStats[0]?.totalReviews || 0,
      unreadMessages: messageStats[0]?.unreadMessages || 0,
      totalMessages: messageStats[0]?.totalMessages || 0,
      sessionsThisMonth: sessionStats[0]?.sessionsThisMonth || 0,
      sessionsLastMonth: sessionStats[0]?.sessionsLastMonth || 0,
    };
  } catch (error) {
    console.error('Error fetching mentor dashboard stats:', error);
    return {
      activeMentees: 0,
      totalMentees: 0,
      upcomingSessions: 0,
      completedSessions: 0,
      monthlyEarnings: 0,
      totalEarnings: 0,
      averageRating: null,
      totalReviews: 0,
      unreadMessages: 0,
      totalMessages: 0,
      sessionsThisMonth: 0,
      sessionsLastMonth: 0,
    };
  }
}

export async function getMentorRecentSessions(mentorId: string, limit: number = 5) {
  try {
    const recentSessions = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        status: sessions.status,
        scheduledAt: sessions.scheduledAt,
        duration: sessions.duration,
        meetingType: sessions.meetingType,
        mentee: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.menteeId, users.id))
      .where(eq(sessions.mentorId, mentorId))
      .orderBy(desc(sessions.scheduledAt))
      .limit(limit);

    return recentSessions.map(session => ({
      ...session,
      mentee: session.mentee || {
        id: '',
        name: 'Unknown',
        email: '',
        image: null,
      },
    }));
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }
}

export async function getMentorRecentMessages(mentorId: string, limit: number = 5) {
  try {
    const recentMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.receiverId, mentorId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return recentMessages.map(message => ({
      ...message,
      sender: message.sender || {
        id: '',
        name: 'Unknown',
        email: '',
        image: null,
      },
    }));
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return [];
  }
}