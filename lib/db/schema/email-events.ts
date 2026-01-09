import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';

export const emailEvents = pgTable('email_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  action: text('action').notNull(),
  to: text('to').notNull(),
  subject: text('subject'),
  template: text('template'),
  actorType: text('actor_type'),
  actorId: text('actor_id'),
  details: jsonb('details'),
}, (table) => ({
  actionOccurredIdx: index('email_events_action_occurred_idx').on(
    table.action,
    table.occurredAt
  ),
  recipientOccurredIdx: index('email_events_recipient_occurred_idx').on(
    table.to,
    table.occurredAt
  ),
}));

export type EmailEvent = typeof emailEvents.$inferSelect;
export type NewEmailEvent = typeof emailEvents.$inferInsert;
