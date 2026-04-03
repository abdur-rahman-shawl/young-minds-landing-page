import { z } from 'zod';

import { notificationTypeEnum } from '@/lib/db/schema';

export const listNotificationsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  unreadOnly: z.boolean().default(false),
});

export const updateNotificationInputSchema = z
  .object({
    notificationId: z.string().uuid(),
    isRead: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (value) => value.isRead !== undefined || value.isArchived !== undefined,
    {
      message: 'At least one notification field must be updated',
    }
  );

export const deleteNotificationInputSchema = z.object({
  notificationId: z.string().uuid(),
});

export const bulkNotificationsInputSchema = z
  .object({
    action: z.enum([
      'mark_read',
      'mark_unread',
      'archive',
      'unarchive',
      'delete',
    ]),
    notificationIds: z.array(z.string().uuid()).min(1).optional(),
    markAllAsRead: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.notificationIds?.length) {
      return;
    }

    if (value.action === 'mark_read' && value.markAllAsRead) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either notificationIds or markAllAsRead must be provided',
      path: ['notificationIds'],
    });
  });

export const createNotificationInputSchema = z.object({
  userId: z.string(),
  type: z.enum(notificationTypeEnum.enumValues),
  title: z.string().min(1),
  message: z.string().min(1),
  relatedId: z.string().uuid().optional(),
  relatedType: z.string().optional(),
  actionUrl: z.string().optional(),
  actionText: z.string().optional(),
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type ListNotificationsInput = z.infer<
  typeof listNotificationsInputSchema
>;
export type UpdateNotificationInput = z.infer<
  typeof updateNotificationInputSchema
>;
export type DeleteNotificationInput = z.infer<
  typeof deleteNotificationInputSchema
>;
export type BulkNotificationsInput = z.infer<
  typeof bulkNotificationsInputSchema
>;
export type CreateNotificationInput = z.infer<
  typeof createNotificationInputSchema
>;
