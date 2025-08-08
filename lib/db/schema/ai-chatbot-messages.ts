import { pgTable, uuid, text, timestamp, json } from 'drizzle-orm/pg-core';
import { users } from './users';

export const aiChatbotMessages = pgTable('ai_chatbot_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatSessionId: uuid('chat_session_id').notNull(),
  userId: text('user_id').references(() => users.id), // nullable, for logged-in users
  senderType: text('sender_type').notNull(), // 'user' or 'ai'
  content: text('content').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AiChatbotMessage = typeof aiChatbotMessages.$inferSelect;
export type NewAiChatbotMessage = typeof aiChatbotMessages.$inferInsert;
