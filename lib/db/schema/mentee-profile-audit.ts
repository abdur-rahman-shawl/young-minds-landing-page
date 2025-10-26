
import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { mentees } from './mentees';
import { users } from './users';

export const menteesProfileAudit = pgTable('mentees_profile_audit', {
  auditId: uuid('audit_id').defaultRandom().primaryKey(),
  menteeId: uuid('mentee_id').references(() => mentees.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'no action' }).notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  oldProfileData: jsonb('old_profile_data'),
  newProfileData: jsonb('new_profile_data').notNull(),
  sourceOfChange: text('source_of_change'),
});

export type MenteeProfileAudit = typeof menteesProfileAudit.$inferSelect;
export type NewMenteeProfileAudit = typeof menteesProfileAudit.$inferInsert;
