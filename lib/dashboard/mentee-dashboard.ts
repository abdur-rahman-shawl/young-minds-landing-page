type DashboardBooking = {
  id: string;
  mentorId: string;
  menteeId: string;
  scheduledAt: string;
  duration?: number | null;
  status: string;
  title?: string | null;
  description?: string | null;
  mentorName?: string | null;
  mentorAvatar?: string | null;
};

type SessionTypeFilter = 'upcoming' | 'past' | 'all';

export interface LegacySessionItem {
  id: string;
  mentorId: string;
  menteeId: string;
  scheduledAt: string;
  duration: number;
  status: string;
  topic: string | null;
  notes: string | null;
  rating: number | null;
  feedback: string | null;
  mentorName: string;
  mentorTitle: string | null;
  mentorCompany: string | null;
  mentorImage?: string | null;
}

export interface MenteeDashboardSummary {
  stats: {
    sessionsBooked: {
      value: number;
      description: string;
      trend: 'up' | 'down' | 'neutral';
    };
    hoursLearned: {
      value: string;
      description: string;
      trend: 'up' | 'down' | 'neutral';
    };
    mentorsConnected: {
      value: number;
      description: string;
      trend: 'up' | 'down' | 'neutral';
    };
  };
  summary: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalHours: string;
    lastMonthSessions: number;
    lastWeekSessions: number;
  };
}

function getMonthWindow(date: Date, offsetMonths = 0) {
  return new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1);
}

export function buildMenteeDashboardSummary(
  bookings: DashboardBooking[],
  now = new Date()
): MenteeDashboardSummary {
  if (bookings.length === 0) {
    return {
      stats: {
        sessionsBooked: {
          value: 0,
          description: 'No sessions yet',
          trend: 'neutral',
        },
        hoursLearned: {
          value: '0.0',
          description: 'No learning hours yet',
          trend: 'neutral',
        },
        mentorsConnected: {
          value: 0,
          description: 'No mentor connections yet',
          trend: 'neutral',
        },
      },
      summary: {
        totalSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        totalHours: '0.0',
        lastMonthSessions: 0,
        lastWeekSessions: 0,
      },
    };
  }

  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfCurrentMonth = getMonthWindow(now, 0);
  const startOfPreviousMonth = getMonthWindow(now, -1);

  const totalSessions = bookings.length;
  const completedSessions = bookings.filter(
    (booking) => booking.status === 'completed'
  ).length;
  const upcomingSessions = bookings.filter(
    (booking) => new Date(booking.scheduledAt) > now
  ).length;
  const totalMinutes = bookings.reduce(
    (sum, booking) => sum + (booking.duration ?? 60),
    0
  );
  const lastWeekSessions = bookings.filter(
    (booking) => new Date(booking.scheduledAt) >= lastWeekStart
  ).length;
  const currentMonthSessions = bookings.filter((booking) => {
    const scheduledAt = new Date(booking.scheduledAt);
    return scheduledAt >= startOfCurrentMonth;
  }).length;
  const previousMonthSessions = bookings.filter((booking) => {
    const scheduledAt = new Date(booking.scheduledAt);
    return scheduledAt >= startOfPreviousMonth && scheduledAt < startOfCurrentMonth;
  }).length;

  const mentorIds = new Set(
    bookings.map((booking) => booking.mentorId).filter(Boolean)
  );
  const currentMonthMentorIds = new Set(
    bookings
      .filter((booking) => new Date(booking.scheduledAt) >= startOfCurrentMonth)
      .map((booking) => booking.mentorId)
      .filter(Boolean)
  );
  const previousMonthMentorIds = new Set(
    bookings
      .filter((booking) => {
        const scheduledAt = new Date(booking.scheduledAt);
        return scheduledAt >= startOfPreviousMonth && scheduledAt < startOfCurrentMonth;
      })
      .map((booking) => booking.mentorId)
      .filter(Boolean)
  );

  const sessionGrowth = currentMonthSessions - previousMonthSessions;
  const mentorGrowth = currentMonthMentorIds.size - previousMonthMentorIds.size;
  const totalHours = (totalMinutes / 60).toFixed(1);
  const lastWeekHours = (
    bookings
      .filter((booking) => new Date(booking.scheduledAt) >= lastWeekStart)
      .reduce((sum, booking) => sum + (booking.duration ?? 60), 0) / 60
  ).toFixed(1);

  return {
    stats: {
      sessionsBooked: {
        value: totalSessions,
        description:
          sessionGrowth === 0
            ? 'No change from last month'
            : `${sessionGrowth > 0 ? '+' : ''}${sessionGrowth} from last month`,
        trend:
          sessionGrowth > 0 ? 'up' : sessionGrowth < 0 ? 'down' : 'neutral',
      },
      hoursLearned: {
        value: totalHours,
        description:
          Number(lastWeekHours) > 0
            ? `+${lastWeekHours} hours this week`
            : 'No sessions this week',
        trend: Number(lastWeekHours) > 0 ? 'up' : 'neutral',
      },
      mentorsConnected: {
        value: mentorIds.size,
        description:
          mentorGrowth > 0
            ? `${mentorGrowth} new connection${mentorGrowth > 1 ? 's' : ''}`
            : 'No new connections',
        trend: mentorGrowth > 0 ? 'up' : 'neutral',
      },
    },
    summary: {
      totalSessions,
      completedSessions,
      upcomingSessions,
      totalHours,
      lastMonthSessions: currentMonthSessions,
      lastWeekSessions,
    },
  };
}

export function buildLegacySessions(
  bookings: DashboardBooking[],
  type: SessionTypeFilter,
  now = new Date()
): LegacySessionItem[] {
  return bookings
    .filter((booking) => {
      if (type === 'all') {
        return true;
      }

      const scheduledAt = new Date(booking.scheduledAt);
      return type === 'upcoming' ? scheduledAt > now : scheduledAt <= now;
    })
    .map((booking) => ({
      id: booking.id,
      mentorId: booking.mentorId,
      menteeId: booking.menteeId,
      scheduledAt: booking.scheduledAt,
      duration: booking.duration ?? 60,
      status: booking.status,
      topic: booking.title ?? null,
      notes: booking.description ?? null,
      rating: null,
      feedback: null,
      mentorName: booking.mentorName ?? 'Unknown Mentor',
      mentorTitle: null,
      mentorCompany: null,
      mentorImage: booking.mentorAvatar ?? null,
    }));
}
