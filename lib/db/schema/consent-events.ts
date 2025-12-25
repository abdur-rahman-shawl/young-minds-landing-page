import { pgTable, text, timestamp, uuid, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const consentActionEnum = pgEnum('consent_action', [
  'granted',
  'denied',
  'revoked',
]);

export const consentSourceEnum = pgEnum('consent_source', [
  'ui',
  'oauth',
  'browser_prompt',
  'system',
]);

export const consentEvents = pgTable('consent_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userRole: text('user_role'),
  consentType: text('consent_type').notNull(),
  consentVersion: text('consent_version'),
  action: consentActionEnum('action').notNull(),
  source: consentSourceEnum('source').notNull(),
  context: jsonb('context').default({}).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userTypeCreatedIdx: index('consent_events_user_type_created_idx').on(
    table.userId,
    table.consentType,
    table.createdAt
  ),
  typeCreatedIdx: index('consent_events_type_created_idx').on(
    table.consentType,
    table.createdAt
  ),
}));

export const consentEventsRelations = relations(consentEvents, ({ one }) => ({
  user: one(users, {
    fields: [consentEvents.userId],
    references: [users.id],
  }),
}));

export type ConsentEvent = typeof consentEvents.$inferSelect;
export type NewConsentEvent = typeof consentEvents.$inferInsert;
export type ConsentAction = typeof consentActionEnum.enumValues[number];
export type ConsentSource = typeof consentSourceEnum.enumValues[number];
