import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiChatbotMessages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { recordChatInsight } from '@/lib/chatbot/insights';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess, trackFeatureUsage } from '@/lib/subscriptions/enforcement';

// GET: fetch all messages for a chat session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatSessionId = searchParams.get('chatSessionId');
    if (!chatSessionId) {
      return NextResponse.json({ success: false, error: 'chatSessionId is required' }, { status: 400 });
    }
    const messages = await db
      .select()
      .from(aiChatbotMessages)
      .where(eq(aiChatbotMessages.chatSessionId, chatSessionId))
      .orderBy(aiChatbotMessages.createdAt);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: save a new message
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id || null;

    const body = await request.json();
    const { chatSessionId, senderType, content, metadata } = body;
    if (!chatSessionId || !senderType || !content) {
      return NextResponse.json({ success: false, error: 'chatSessionId, senderType, and content are required' }, { status: 400 });
    }

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    let ipAddress = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Normalize localhost addresses
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
      ipAddress = 'localhost';
    }

    // Subscription Enforcement for Logged-in Users
    if (userId && senderType === 'user') {
      const { has_access, reason } = await checkFeatureAccess(userId, FEATURE_KEYS.AI_HELPER_MESSAGES_LIMIT);
      if (!has_access) {
        return NextResponse.json({ success: false, error: reason || 'Message limit reached' }, { status: 403 });
      }
    }

    const [newMessage] = await db
      .insert(aiChatbotMessages)
      .values({
        chatSessionId,
        userId: userId || null,
        senderType,
        content: content.trim(),
        metadata: metadata || null,
        ipAddress,
      })
      .returning();

    if (newMessage && senderType === 'user') {
      recordChatInsight({
        messageId: newMessage.id,
        chatSessionId,
        userId: userId || null,
        content: newMessage.content,
      }).catch((error) => {
        console.error('[chatbot-insights] recording failed', error);
      });
    }

    // Track usage for logged-in users
    if (userId && senderType === 'user') {
      await trackFeatureUsage(userId, FEATURE_KEYS.AI_HELPER_MESSAGES_LIMIT, { count: 1 });
    }

    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 });
  }
}
