import { describe, expect, it } from 'vitest';

import { buildAdminOverview } from '@/lib/admin/overview';

describe('buildAdminOverview', () => {
  it('counts pending mentor states using the full admin review set', () => {
    const overview = buildAdminOverview(
      {
        mentors: [
          {
            verificationStatus: 'RESUBMITTED',
            isAvailable: true,
            createdAt: '2026-04-01T00:00:00.000Z',
          },
          {
            verificationStatus: 'UPDATED_PROFILE',
            isAvailable: true,
            createdAt: '2026-04-02T00:00:00.000Z',
          },
          {
            verificationStatus: 'VERIFIED',
            isAvailable: true,
            createdAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        mentees: [],
        enquiries: [],
      },
      {
        now: new Date('2026-04-03T00:00:00.000Z'),
      }
    );

    expect(overview.mentors.pending).toBe(2);
    expect(overview.mentors.verified).toBe(1);
    expect(overview.mentors.available).toBe(1);
  });

  it('computes enquiry and user totals consistently', () => {
    const overview = buildAdminOverview(
      {
        mentors: [
          {
            verificationStatus: 'IN_PROGRESS',
            isAvailable: null,
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        ],
        mentees: [
          { createdAt: '2026-04-02T00:00:00.000Z' },
          { createdAt: '2026-01-01T00:00:00.000Z' },
        ],
        enquiries: [{ isResolved: false }, { isResolved: true }],
      },
      {
        now: new Date('2026-04-03T00:00:00.000Z'),
      }
    );

    expect(overview.totals.totalUsers).toBe(3);
    expect(overview.mentees.joinedThisWeek).toBe(1);
    expect(overview.enquiries.total).toBe(2);
    expect(overview.enquiries.open).toBe(1);
    expect(overview.enquiries.resolved).toBe(1);
  });
});
