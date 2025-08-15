import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for notification updates
const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// PUT /api/notifications/[id] - Update notification (mark as read/archived)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await req.json();
    const validatedData = updateNotificationSchema.parse(body);

    // Verify notification belongs to user
    const existingNotification = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, params.id),
          eq(notifications.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingNotification.length) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
    };

    // Set timestamps for read/archived states
    if (validatedData.isRead === true && !existingNotification[0].isRead) {
      updateData.readAt = new Date();
    } else if (validatedData.isRead === false) {
      updateData.readAt = null;
    }

    if (validatedData.isArchived === true && !existingNotification[0].isArchived) {
      updateData.archivedAt = new Date();
    } else if (validatedData.isArchived === false) {
      updateData.archivedAt = null;
    }

    // Update the notification
    const [updatedNotification] = await db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      notification: updatedNotification,
      message: 'Notification updated successfully!'
    });

  } catch (error) {
    console.error('Notification update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify notification belongs to user
    const existingNotification = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, params.id),
          eq(notifications.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingNotification.length) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the notification
    await db
      .delete(notifications)
      .where(eq(notifications.id, params.id));

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully!'
    });

  } catch (error) {
    console.error('Notification deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}