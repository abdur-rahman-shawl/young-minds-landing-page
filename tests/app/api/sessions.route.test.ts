import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { requireUserWithRoles, getSession } = vi.hoisted(() => ({
  requireUserWithRoles: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/lib/api/guards', () => ({
  requireUserWithRoles,
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {},
}));

vi.mock('@/lib/subscriptions/enforcement', () => ({
  getPlanFeatures: vi.fn(),
}));

vi.mock('@/lib/subscriptions/policy-runtime', () => ({
  consumeFeature: vi.fn(),
  enforceFeature: vi.fn(),
  isSubscriptionPolicyError: vi.fn(() => false),
}));

vi.mock('@/lib/subscriptions/policies', () => ({
  ACTION_POLICIES: {
    paid: {
      featureKey: 'paid_feature',
    },
  },
  resolveMenteeBookingAction: vi.fn(() => 'paid'),
}));

import { POST } from '@/app/api/sessions/route';

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects legacy booking requests from non-mentees', async () => {
    requireUserWithRoles.mockResolvedValue({
      session: { user: { id: 'mentor-user' } },
      user: {
        roles: [{ name: 'mentor' }],
      },
    });

    const response = await POST(
      new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'book',
          mentorId: 'mentor-target',
          scheduledAt: '2026-04-10T10:00:00.000Z',
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Only mentees can book sessions',
    });
    expect(getSession).not.toHaveBeenCalled();
  });
});
