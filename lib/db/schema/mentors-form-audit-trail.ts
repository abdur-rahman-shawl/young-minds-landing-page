import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { mentors, users, verificationStatusEnum } from './mentors';

export const mentorFormSubmissionTypeEnum = pgEnum('mentor_form_submission_type', ['CREATE', 'UPDATE']);

export const mentorsFormAuditTrail = pgTable('mentors_form_audit_trail', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id')
    .references(() => mentors.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  submissionType: mentorFormSubmissionTypeEnum('submission_type')
    .default('CREATE')
    .notNull(),
  verificationStatus: verificationStatusEnum('verification_status').notNull(),
  formData: jsonb('form_data').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MentorFormAuditEntry = typeof mentorsFormAuditTrail.$inferSelect;
export type NewMentorFormAuditEntry = typeof mentorsFormAuditTrail.$inferInsert;

