import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }), // Optional: link to session
  
  // Message content
  content: text('content').notNull(),
  messageType: text('message_type').default('text'), // 'text', 'image', 'file', 'system'
  
  // Message metadata
  isRead: boolean('is_read').default(false),
  isDelivered: boolean('is_delivered').default(false),
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  
  // File attachments (if any)
  attachmentUrl: text('attachment_url'),
  attachmentType: text('attachment_type'), // 'image', 'document', 'video', etc.
  attachmentSize: text('attachment_size'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
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
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert; 