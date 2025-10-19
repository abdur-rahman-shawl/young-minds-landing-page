import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications, NewNotification } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/notifications - Get user's notifications
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    let whereCondition = eq(notifications.userId, session.user.id);
    
    if (unreadOnly) {
      whereCondition = and(whereCondition, eq(notifications.isRead, false));
    }

    // Get notifications
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(whereCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalCount] = await db
      .select({ count: count() })
      .from(notifications)
      .where(whereCondition);

    // Get unread count
    const [unreadCount] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false)
        )
      );

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
      pagination: {
        total: totalCount.count,
        limit,
        offset,
        hasMore: offset + limit < totalCount.count
      },
      unreadCount: unreadCount.count
    });

  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

const createNotificationSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  console.log('🚀 === CREATE NOTIFICATION API CALLED ===');
  try {
    const body = await req.json();
    console.log('📋 Request body:', body);
    const validatedData = createNotificationSchema.parse(body);
    console.log('✅ Validated data:', validatedData);

    const [newNotification] = await db
      .insert(notifications)
      .values(validatedData as NewNotification)
      .returning();

    console.log('🎉 SUCCESS: Notification created in database:', newNotification);
    return NextResponse.json({ success: true, notification: newNotification });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}