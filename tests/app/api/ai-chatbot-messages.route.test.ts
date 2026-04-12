import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getSession, select, from, where, orderBy, eq, and } = vi.hoisted(() => ({
  getSession: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    select,
  },
}));

vi.mock('@/lib/db/schema', () => ({
  aiChatbotMessages: {
    chatSessionId: 'chatSessionId',
    userId: 'userId',
    createdAt: 'createdAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and,
  eq,
}));

vi.mock('@/lib/chatbot/insights', () => ({
  recordChatInsight: vi.fn(),
}));

vi.mock('@/lib/subscriptions/policy-runtime', () => ({
  consumeFeature: vi.fn(),
  enforceFeature: vi.fn(),
  isSubscriptionPolicyError: vi.fn(),
}));

import { GET } from '@/app/api/ai-chatbot-messages/route';

describe('GET /api/ai-chatbot-messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    select.mockReturnValue({ from });
    from.mockReturnValue({ where });
    where.mockReturnValue({ orderBy });
    eq.mockImplementation((column, value) => ({ column, value }));
    and.mockImplementation((...conditions) => ({ conditions }));
  });

  it('requires authentication before reading stored chat history', async () => {
    getSession.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/ai-chatbot-messages?chatSessionId=chat-session-1'
      )
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Authentication required',
    });
    expect(select).not.toHaveBeenCalled();
  });

  it('scopes stored chat history to the authenticated user', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1' } });
    orderBy.mockResolvedValue([{ id: 'message-1' }]);

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/ai-chatbot-messages?chatSessionId=chat-session-1'
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [{ id: 'message-1' }],
    });
    expect(eq).toHaveBeenCalledWith('chatSessionId', 'chat-session-1');
    expect(eq).toHaveBeenCalledWith('userId', 'user-1');
    expect(and).toHaveBeenCalledTimes(1);
  });
});
