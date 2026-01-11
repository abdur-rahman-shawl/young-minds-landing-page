import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  messageRequests, 
  messagingPermissions, 
  messageQuotas,
  notifications,
  users,
  mentors,
  mentees
} from '@/lib/db/schema';
import { eq, and, or, desc, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess, trackFeatureUsage } from '@/lib/subscriptions/enforcement';

const createRequestSchema = z.object({
  recipientId: z.string().min(1),
  initialMessage: z.string().min(10).max(500),
  requestReason: z.string().optional(),
  requestType: z.enum(['mentor_to_mentee', 'mentee_to_mentor'])
});

async function checkAndUpdateQuota(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let quota = await db
    .select()
    .from(messageQuotas)
    .where(eq(messageQuotas.userId, userId))
    .limit(1);

  if (quota.length === 0) {
    const [newQuota] = await db
      .insert(messageQuotas)
      .values({ userId })
      .returning();
    quota = [newQuota];
  }

  const currentQuota = quota[0];
  
  const shouldResetDaily = currentQuota.lastResetDaily < startOfDay;
  const shouldResetWeekly = currentQuota.lastResetWeekly < startOfWeek;
  const shouldResetMonthly = currentQuota.lastResetMonthly < startOfMonth;

  if (shouldResetDaily || shouldResetWeekly || shouldResetMonthly) {
    const updates: any = {};
    
    if (shouldResetDaily) {
      updates.requestsSentToday = 0;
      updates.messagesSentToday = 0;
      updates.lastResetDaily = startOfDay;
    }
    if (shouldResetWeekly) {
      updates.requestsSentThisWeek = 0;
      updates.lastResetWeekly = startOfWeek;
    }
    if (shouldResetMonthly) {
      updates.requestsSentThisMonth = 0;
      updates.lastResetMonthly = startOfMonth;
    }

    await db
      .update(messageQuotas)
      .set(updates)
      .where(eq(messageQuotas.userId, userId));

    Object.assign(currentQuota, updates);
  }

  if (currentQuota.requestsSentToday >= currentQuota.dailyRequestLimit) {
    throw new Error('Daily request limit exceeded');
  }
  if (currentQuota.requestsSentThisWeek >= currentQuota.weeklyRequestLimit) {
    throw new Error('Weekly request limit exceeded');
  }
  if (currentQuota.requestsSentThisMonth >= currentQuota.monthlyRequestLimit) {
    throw new Error('Monthly request limit exceeded');
  }

  await db
    .update(messageQuotas)
    .set({
      requestsSentToday: currentQuota.requestsSentToday + 1,
      requestsSentThisWeek: currentQuota.requestsSentThisWeek + 1,
      requestsSentThisMonth: currentQuota.requestsSentThisMonth + 1,
      updatedAt: new Date()
    })
    .where(eq(messageQuotas.userId, userId));

  return true;
}

async function checkExistingRequest(requesterId: string, recipientId: string) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const existing = await db
    .select()
    .from(messageRequests)
    .where(
      and(
        eq(messageRequests.requesterId, requesterId),
        eq(messageRequests.recipientId, recipientId),
        eq(messageRequests.status, 'pending'),
        gte(messageRequests.createdAt, oneWeekAgo)
      )
    )
    .limit(1);

  return existing.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const { searchParams } = new URL(request.url);
    const userId = session?.user?.id;
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'pending';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let query = db
      .select({
        request: messageRequests,
        requester: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image
        }
      })
      .from(messageRequests)
      .leftJoin(users, eq(messageRequests.requesterId, users.id));

    if (type === 'sent') {
      query = query.where(eq(messageRequests.requesterId, userId));
    } else if (type === 'received') {
      query = query.where(eq(messageRequests.recipientId, userId));
    } else {
      query = query.where(
        or(
          eq(messageRequests.requesterId, userId),
          eq(messageRequests.recipientId, userId)
        )
      );
    }

    if (status !== 'all') {
      query = query.where(eq(messageRequests.status, status as any));
    }

    const requests = await query.orderBy(desc(messageRequests.createdAt));

    return NextResponse.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching message requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const body = await request.json();
    const { recipientId, ...requestData } = body;
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const validatedData = createRequestSchema.parse({ recipientId, ...requestData });

    if (validatedData.recipientId === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot send a message request to yourself' },
        { status: 400 }
      );
    }

    const { has_access, reason } = await checkFeatureAccess(
      userId,
      FEATURE_KEYS.MESSAGE_REQUESTS_DAILY
    );
    if (!has_access) {
      return NextResponse.json(
        { success: false, error: reason || 'Daily request limit reached. Upgrade your plan for more.' },
        { status: 403 }
      );
    }

    // Legacy quota system is superseded by subscription enforcement.
    // await checkAndUpdateQuota(userId);

    if (await checkExistingRequest(userId, validatedData.recipientId)) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending request to this user' },
        { status: 400 }
      );
    }

    const existingPermission = await db
      .select()
      .from(messagingPermissions)
      .where(
        and(
          or(
            and(
              eq(messagingPermissions.userId, userId),
              eq(messagingPermissions.allowedUserId, validatedData.recipientId)
            ),
            and(
              eq(messagingPermissions.userId, validatedData.recipientId),
              eq(messagingPermissions.allowedUserId, userId)
            )
          ),
          eq(messagingPermissions.status, 'active')
        )
      )
      .limit(1);

    if (existingPermission.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have permission to message this user' },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [newRequest] = await db
      .insert(messageRequests)
      .values({
        requesterId: userId,
        recipientId: validatedData.recipientId,
        initialMessage: validatedData.initialMessage,
        requestReason: validatedData.requestReason,
        requestType: validatedData.requestType,
        status: 'pending',
        expiresAt,
        maxMessages: validatedData.requestType === 'mentee_to_mentor' ? 1 : 3,
      })
      .returning();

    await trackFeatureUsage(
      userId,
      FEATURE_KEYS.MESSAGE_REQUESTS_DAILY,
      { count: 1 },
      'message_request',
      newRequest.id
    );

    const recipient = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.recipientId))
      .limit(1);

    const requester = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (recipient.length > 0 && requester.length > 0) {
      await db
        .insert(notifications)
        .values({
          userId: validatedData.recipientId,
          type: 'MESSAGE_RECEIVED',
          title: 'New Message Request',
          message: `${requester[0].name || 'Someone'} wants to send you a message`,
          relatedId: newRequest.id,
          relatedType: 'message_request',
          actionUrl: '/dashboard/messages/requests',
          actionText: 'View Request'
        });
    }

    return NextResponse.json({
      success: true,
      data: newRequest,
      message: 'Message request sent successfully'
    });
  } catch (error) {
    console.error('Error creating message request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('limit exceeded')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create message request' },
      { status: 500 }
    );
  }
}
