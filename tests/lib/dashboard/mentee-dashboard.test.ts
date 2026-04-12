import { describe, expect, it } from 'vitest';

import {
  buildLegacySessions,
  buildMenteeDashboardSummary,
} from '@/lib/dashboard/mentee-dashboard';

const bookings = [
  {
    id: 'booking-1',
    mentorId: 'mentor-1',
    menteeId: 'mentee-1',
    scheduledAt: '2026-04-10T10:00:00.000Z',
    duration: 60,
    status: 'scheduled',
    title: 'Upcoming session',
    description: 'Focus on career planning',
    mentorName: 'Mentor One',
    mentorAvatar: 'https://example.com/mentor-1.png',
  },
  {
    id: 'booking-2',
    mentorId: 'mentor-1',
    menteeId: 'mentee-1',
    scheduledAt: '2026-04-02T12:00:00.000Z',
    duration: 90,
    status: 'completed',
    title: 'Completed session',
    description: 'Resume review',
    mentorName: 'Mentor One',
    mentorAvatar: null,
  },
  {
    id: 'booking-3',
    mentorId: 'mentor-2',
    menteeId: 'mentee-1',
    scheduledAt: '2026-03-10T12:00:00.000Z',
    duration: 30,
    status: 'completed',
    title: 'Previous month session',
    description: null,
    mentorName: 'Mentor Two',
    mentorAvatar: null,
  },
];

describe('buildMenteeDashboardSummary', () => {
  it('builds stats and summary from bookings', () => {
    const result = buildMenteeDashboardSummary(
      bookings,
      new Date('2026-04-06T00:00:00.000Z')
    );

    expect(result.summary).toEqual({
      totalSessions: 3,
      completedSessions: 2,
      upcomingSessions: 1,
      totalHours: '3.0',
      lastMonthSessions: 2,
      lastWeekSessions: 2,
    });
    expect(result.stats.sessionsBooked.value).toBe(3);
    expect(result.stats.sessionsBooked.trend).toBe('up');
    expect(result.stats.mentorsConnected.value).toBe(2);
    expect(result.stats.hoursLearned.description).toBe('+2.5 hours this week');
  });

  it('returns the empty-state summary when there are no bookings', () => {
    const result = buildMenteeDashboardSummary([]);

    expect(result.summary.totalSessions).toBe(0);
    expect(result.stats.sessionsBooked.description).toBe('No sessions yet');
    expect(result.stats.hoursLearned.value).toBe('0.0');
    expect(result.stats.mentorsConnected.value).toBe(0);
  });
});

describe('buildLegacySessions', () => {
  it('filters upcoming sessions and maps the legacy session shape', () => {
    const result = buildLegacySessions(
      bookings,
      'upcoming',
      new Date('2026-04-06T00:00:00.000Z')
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'booking-1',
      mentorId: 'mentor-1',
      menteeId: 'mentee-1',
      topic: 'Upcoming session',
      notes: 'Focus on career planning',
      mentorName: 'Mentor One',
      mentorImage: 'https://example.com/mentor-1.png',
    });
  });

  it('filters past sessions correctly', () => {
    const result = buildLegacySessions(
      bookings,
      'past',
      new Date('2026-04-06T00:00:00.000Z')
    );

    expect(result.map((session) => session.id)).toEqual([
      'booking-2',
      'booking-3',
    ]);
  });
});
