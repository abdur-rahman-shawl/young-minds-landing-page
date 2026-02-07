import { pgTable, text, timestamp, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Define notification types
export const notificationTypeEnum = pgEnum('notification_type', [
  'BOOKING_REQUEST',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'SESSION_REMINDER',
  'SESSION_COMPLETED',
  'PAYMENT_RECEIVED',
  'MESSAGE_RECEIVED',
  'PROFILE_UPDATED',
  'SYSTEM_ANNOUNCEMENT',
  'MENTOR_APPLICATION_APPROVED',
  'MENTOR_APPLICATION_REJECTED',
  'MENTOR_APPLICATION_UPDATE_REQUESTED',
  // Reschedule approval flow
  'RESCHEDULE_REQUEST',
  'RESCHEDULE_ACCEPTED',
  'RESCHEDULE_REJECTED',
  'RESCHEDULE_COUNTER',
  'RESCHEDULE_WITHDRAWN',
  // Session reassignment (when mentor cancels)
  'SESSION_REASSIGNED',
  'REASSIGNMENT_ACCEPTED',
  'REASSIGNMENT_REJECTED',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Notification content
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),

  // Related resources
  relatedId: uuid('related_id'), // Could be session_id, booking_id, etc.
  relatedType: text('related_type'), // 'session', 'booking', 'message', etc.

  // Notification state
  isRead: boolean('is_read').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),

  // Optional action data
  actionUrl: text('action_url'), // URL to navigate when clicking notification
  actionText: text('action_text'), // Text for action button

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
  archivedAt: timestamp('archived_at'),
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = typeof notificationTypeEnum.enumValues[number];