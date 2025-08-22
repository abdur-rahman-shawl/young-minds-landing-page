import { pgTable, text, timestamp, boolean, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { messages } from './messages';

export const threadStatusEnum = pgEnum('thread_status', [
  'active',
  'archived',
  'deleted'
]);

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  participant1Id: text('participant1_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  participant2Id: text('participant2_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  status: threadStatusEnum('status').default('active').notNull(),
  
  lastMessageId: uuid('last_message_id'),
  lastMessageAt: timestamp('last_message_at'),
  lastMessagePreview: text('last_message_preview'),
  
  participant1UnreadCount: integer('participant1_unread_count').default(0),
  participant2UnreadCount: integer('participant2_unread_count').default(0),
  
  participant1LastReadAt: timestamp('participant1_last_read_at'),
  participant2LastReadAt: timestamp('participant2_last_read_at'),
  
  participant1Muted: boolean('participant1_muted').default(false),
  participant2Muted: boolean('participant2_muted').default(false),
  participant1MutedUntil: timestamp('participant1_muted_until'),
  participant2MutedUntil: timestamp('participant2_muted_until'),
  
  participant1Archived: boolean('participant1_archived').default(false),
  participant2Archived: boolean('participant2_archived').default(false),
  participant1ArchivedAt: timestamp('participant1_archived_at'),
  participant2ArchivedAt: timestamp('participant2_archived_at'),
  
  participant1Deleted: boolean('participant1_deleted').default(false),
  participant2Deleted: boolean('participant2_deleted').default(false),
  participant1DeletedAt: timestamp('participant1_deleted_at'),
  participant2DeletedAt: timestamp('participant2_deleted_at'),
  
  totalMessages: integer('total_messages').default(0),
  
  metadata: text('metadata'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
  participant1: one(users, {
    fields: [messageThreads.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [messageThreads.participant2Id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export type MessageThread = typeof messageThreads.$inferSelect;
export type NewMessageThread = typeof messageThreads.$inferInsert;
export type ThreadStatus = typeof threadStatusEnum.enumValues[number];