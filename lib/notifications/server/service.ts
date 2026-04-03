import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import type { TRPCContext } from '@/lib/trpc/context';
import {
  assertNotification,
} from './errors';
import type {
  BulkNotificationsInput,
  CreateNotificationInput,
  DeleteNotificationInput,
  ListNotificationsInput,
  UpdateNotificationInput,
} from './schemas';
import {
  bulkNotificationsInputSchema,
  createNotificationInputSchema,
  deleteNotificationInputSchema,
  listNotificationsInputSchema,
  updateNotificationInputSchema,
} from './schemas';
import {
  buildBulkNotificationUpdate,
  buildNotificationUpdateData,
} from '../state-utils';

type AuthenticatedContext = TRPCContext & {
  userId: string;
};

type NotificationContext = Pick<AuthenticatedContext, 'db' | 'userId'>;

function getNotificationDb(context?: Pick<TRPCContext, 'db'>) {
  return context?.db ?? db;
}

export async function listNotifications(
  context: NotificationContext,
  input: ListNotificationsInput
) {
  const parsed = listNotificationsInputSchema.parse(input);
  const database = getNotificationDb(context);
  const conditions = [eq(notifications.userId, context.userId)];

  if (parsed.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const whereCondition =
    conditions.length === 1 ? conditions[0] : and(...conditions);

  const [items, [totalCount], [unreadCount]] = await Promise.all([
    database
      .select()
      .from(notifications)
      .where(whereCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset),
    database
      .select({ count: count() })
      .from(notifications)
      .where(whereCondition),
    database
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, context.userId),
          eq(notifications.isRead, false)
        )
      ),
  ]);

  const total = Number(totalCount?.count ?? 0);
  const unread = Number(unreadCount?.count ?? 0);

  return {
    notifications: items,
    pagination: {
      total,
      limit: parsed.limit,
      offset: parsed.offset,
      hasMore: parsed.offset + parsed.limit < total,
    },
    unreadCount: unread,
  };
}

async function getOwnedNotification(
  context: NotificationContext,
  notificationId: string
) {
  const database = getNotificationDb(context);
  const [existingNotification] = await database
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, context.userId)
      )
    )
    .limit(1);

  assertNotification(
    existingNotification,
    404,
    'Notification not found or access denied'
  );

  return existingNotification;
}

export async function updateNotification(
  context: NotificationContext,
  input: UpdateNotificationInput
) {
  const parsed = updateNotificationInputSchema.parse(input);
  const database = getNotificationDb(context);
  const existingNotification = await getOwnedNotification(
    context,
    parsed.notificationId
  );

  const updateData = buildNotificationUpdateData(existingNotification, {
    isRead: parsed.isRead,
    isArchived: parsed.isArchived,
  });

  const [updatedNotification] = await database
    .update(notifications)
    .set(updateData)
    .where(eq(notifications.id, parsed.notificationId))
    .returning();

  assertNotification(updatedNotification, 500, 'Failed to update notification');

  return {
    notification: updatedNotification,
    message: 'Notification updated successfully!',
  };
}

export async function deleteNotification(
  context: NotificationContext,
  input: DeleteNotificationInput
) {
  const parsed = deleteNotificationInputSchema.parse(input);
  const database = getNotificationDb(context);

  await getOwnedNotification(context, parsed.notificationId);

  await database
    .delete(notifications)
    .where(eq(notifications.id, parsed.notificationId));

  return {
    success: true,
    message: 'Notification deleted successfully!',
  };
}

export async function bulkUpdateNotifications(
  context: NotificationContext,
  input: BulkNotificationsInput
) {
  const parsed = bulkNotificationsInputSchema.parse(input);
  const database = getNotificationDb(context);
  const conditions = [eq(notifications.userId, context.userId)];

  if (parsed.notificationIds?.length) {
    conditions.push(inArray(notifications.id, parsed.notificationIds));
  } else if (parsed.action === 'mark_read' && parsed.markAllAsRead) {
    conditions.push(eq(notifications.isRead, false));
  }

  const whereCondition =
    conditions.length === 1 ? conditions[0] : and(...conditions);

  const bulkAction = buildBulkNotificationUpdate(parsed.action);

  if (bulkAction.mode === 'delete') {
    const deletedNotifications = await database
      .delete(notifications)
      .where(whereCondition)
      .returning({ id: notifications.id });

    return {
      updatedCount: deletedNotifications.length,
      message: bulkAction.message,
    };
  }

  const updatedNotifications = await database
    .update(notifications)
    .set(bulkAction.updateData)
    .where(whereCondition)
    .returning({ id: notifications.id });

  return {
    updatedCount: updatedNotifications.length,
    message: `${bulkAction.message} (${updatedNotifications.length} notifications affected)`,
  };
}

export async function createNotificationRecord(
  input: CreateNotificationInput,
  context?: Pick<TRPCContext, 'db'>
) {
  const parsed = createNotificationInputSchema.parse(input);
  const database = getNotificationDb(context);

  const [createdNotification] = await database
    .insert(notifications)
    .values({
      ...parsed,
      isRead: parsed.isRead ?? false,
      isArchived: parsed.isArchived ?? false,
      readAt: parsed.isRead ? new Date() : null,
      archivedAt: parsed.isArchived ? new Date() : null,
    })
    .returning();

  assertNotification(createdNotification, 500, 'Failed to create notification');

  return createdNotification;
}
