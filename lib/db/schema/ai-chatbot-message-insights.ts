import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { aiChatbotMessages } from './ai-chatbot-messages';

export const aiChatbotMessageInsights = pgTable('ai_chatbot_message_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => aiChatbotMessages.id, { onDelete: 'cascade' }),
  chatSessionId: uuid('chat_session_id').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  intent: text('intent').default('general').notNull(),
  questionText: text('question_text'),
  questionHash: text('question_hash'),
  isQuestion: boolean('is_question').notNull().default(false),
  universities: text('universities').array(),
  source: text('source').default('heuristic').notNull(),
  frequency: integer('frequency').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AiChatbotMessageInsight = typeof aiChatbotMessageInsights.$inferSelect;
export type NewAiChatbotMessageInsight = typeof aiChatbotMessageInsights.$inferInsert;
