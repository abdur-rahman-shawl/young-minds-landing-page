import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for bulk operations
const bulkUpdateSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'archive', 'unarchive', 'delete']),
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID required').optional(),
  markAllAsRead: z.boolean().optional(),
});

// POST /api/notifications/bulk - Bulk operations on notifications
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = bulkUpdateSchema.parse(body);

    let whereCondition = eq(notifications.userId, session.user.id);

    // If specific notification IDs provided, filter by them
    if (validatedData.notificationIds && validatedData.notificationIds.length > 0) {
      whereCondition = and(
        whereCondition,
        inArray(notifications.id, validatedData.notificationIds)
      );
    } else if (validatedData.markAllAsRead && validatedData.action === 'mark_read') {
      // Mark all unread notifications as read
      whereCondition = and(whereCondition, eq(notifications.isRead, false));
    } else if (!validatedData.notificationIds) {
      return NextResponse.json(
        { error: 'Either notificationIds or markAllAsRead must be provided' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    let message = '';

    switch (validatedData.action) {
      case 'mark_read':
        updateData = { isRead: true, readAt: new Date() };
        message = 'Notifications marked as read';
        break;
      case 'mark_unread':
        updateData = { isRead: false, readAt: null };
        message = 'Notifications marked as unread';
        break;
      case 'archive':
        updateData = { isArchived: true, archivedAt: new Date() };
        message = 'Notifications archived';
        break;
      case 'unarchive':
        updateData = { isArchived: false, archivedAt: null };
        message = 'Notifications unarchived';
        break;
      case 'delete':
        // Delete notifications
        await db
          .delete(notifications)
          .where(whereCondition);
        
        return NextResponse.json({
          success: true,
          message: 'Notifications deleted successfully'
        });
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update notifications
    const updatedNotifications = await db
      .update(notifications)
      .set(updateData)
      .where(whereCondition)
      .returning();

    return NextResponse.json({
      success: true,
      updatedCount: updatedNotifications.length,
      message: `${message} (${updatedNotifications.length} notifications affected)`
    });

  } catch (error) {
    console.error('Bulk notifications operation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
