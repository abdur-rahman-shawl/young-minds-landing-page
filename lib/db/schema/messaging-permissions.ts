import { pgTable, text, timestamp, boolean, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const permissionStatusEnum = pgEnum('permission_status', [
  'active',
  'suspended',
  'revoked',
  'expired'
]);

export const messagingPermissions = pgTable('messaging_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  allowedUserId: text('allowed_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  status: permissionStatusEnum('status').default('active').notNull(),
  
  grantedViaRequestId: uuid('granted_via_request_id'),
  
  dailyMessageLimit: integer('daily_message_limit').default(100),
  totalMessageLimit: integer('total_message_limit'),
  messagesExchanged: integer('messages_exchanged').default(0),
  
  canInitiateVideo: boolean('can_initiate_video').default(false),
  canShareFiles: boolean('can_share_files').default(false),
  canScheduleMeetings: boolean('can_schedule_meetings').default(true),
  
  blockedByUser: boolean('blocked_by_user').default(false),
  blockedByAllowedUser: boolean('blocked_by_allowed_user').default(false),
  blockedAt: timestamp('blocked_at'),
  blockReason: text('block_reason'),
  
  lastMessageAt: timestamp('last_message_at'),
  expiresAt: timestamp('expires_at'),
  
  notificationPreferences: text('notification_preferences'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messagingPermissionsRelations = relations(messagingPermissions, ({ one }) => ({
  user: one(users, {
    fields: [messagingPermissions.userId],
    references: [users.id],
  }),
  allowedUser: one(users, {
    fields: [messagingPermissions.allowedUserId],
    references: [users.id],
  }),
}));

export const messageQuotas = pgTable('message_quotas', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  dailyRequestLimit: integer('daily_request_limit').default(5),
  weeklyRequestLimit: integer('weekly_request_limit').default(10),
  monthlyRequestLimit: integer('monthly_request_limit').default(30),
  
  requestsSentToday: integer('requests_sent_today').default(0),
  requestsSentThisWeek: integer('requests_sent_this_week').default(0),
  requestsSentThisMonth: integer('requests_sent_this_month').default(0),
  
  dailyMessageLimit: integer('daily_message_limit').default(500),
  messagesSentToday: integer('messages_sent_today').default(0),
  
  lastResetDaily: timestamp('last_reset_daily').defaultNow().notNull(),
  lastResetWeekly: timestamp('last_reset_weekly').defaultNow().notNull(),
  lastResetMonthly: timestamp('last_reset_monthly').defaultNow().notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messageQuotasRelations = relations(messageQuotas, ({ one }) => ({
  user: one(users, {
    fields: [messageQuotas.userId],
    references: [users.id],
  }),
}));

export type MessagingPermission = typeof messagingPermissions.$inferSelect;
export type NewMessagingPermission = typeof messagingPermissions.$inferInsert;
export type PermissionStatus = typeof permissionStatusEnum.enumValues[number];
export type MessageQuota = typeof messageQuotas.$inferSelect;
export type NewMessageQuota = typeof messageQuotas.$inferInsert;