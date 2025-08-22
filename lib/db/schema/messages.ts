import { pgTable, text, timestamp, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';
import { messageThreads } from './message-threads';

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'file',
  'audio',
  'video',
  'system',
  'request_accepted',
  'request_rejected'
]);

export const messageStatusEnum = pgEnum('message_status', [
  'sending',
  'sent',
  'delivered',
  'read',
  'failed'
]);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  threadId: uuid('thread_id').references(() => messageThreads.id, { onDelete: 'cascade' }),
  
  senderId: text('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: text('receiver_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  
  content: text('content').notNull(),
  messageType: messageTypeEnum('message_type').default('text').notNull(),
  status: messageStatusEnum('status').default('sending').notNull(),
  
  replyToId: uuid('reply_to_id'),
  
  isRead: boolean('is_read').default(false),
  isDelivered: boolean('is_delivered').default(false),
  isEdited: boolean('is_edited').default(false),
  isDeleted: boolean('is_deleted').default(false),
  
  readAt: timestamp('read_at'),
  deliveredAt: timestamp('delivered_at'),
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  
  attachmentUrl: text('attachment_url'),
  attachmentType: text('attachment_type'),
  attachmentSize: text('attachment_size'),
  attachmentName: text('attachment_name'),
  
  metadata: text('metadata'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageType = typeof messageTypeEnum.enumValues[number];
export type MessageStatus = typeof messageStatusEnum.enumValues[number]; 