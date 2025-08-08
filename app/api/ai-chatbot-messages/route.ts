import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiChatbotMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

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
    const body = await request.json();
    const { chatSessionId, userId, senderType, content, metadata } = body;
    if (!chatSessionId || !senderType || !content) {
      return NextResponse.json({ success: false, error: 'chatSessionId, senderType, and content are required' }, { status: 400 });
    }
    const [newMessage] = await db
      .insert(aiChatbotMessages)
      .values({
        chatSessionId,
        userId: userId || null,
        senderType,
        content: content.trim(),
        metadata: metadata || null,
      })
      .returning();
    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 });
  }
}
