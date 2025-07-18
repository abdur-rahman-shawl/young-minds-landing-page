import { pgTable, text, timestamp, boolean, uuid, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const mentoringRelationships = pgTable('mentoring_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  mentorId: uuid('mentor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  menteeId: uuid('mentee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Relationship status
  status: text('status').notNull().default('pending'), // 'pending', 'active', 'paused', 'completed', 'cancelled'
  
  // Relationship details
  goals: text('goals'), // What the mentee wants to achieve
  duration: text('duration'), // Expected duration of mentorship
  frequency: text('frequency'), // How often they plan to meet
  
  // Pricing arrangement
  rate: decimal('rate', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  billingType: text('billing_type').default('per_session'), // 'per_session', 'monthly', 'package'
  
  // Progress tracking
  progress: text('progress'), // JSON for progress tracking
  milestones: text('milestones'), // JSON for milestone tracking
  
  // Dates
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  pausedAt: timestamp('paused_at'),
  
  // Approval workflow
  approvedByMentor: boolean('approved_by_mentor').default(false),
  approvedByMentee: boolean('approved_by_mentee').default(false),
  approvedAt: timestamp('approved_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const mentoringRelationshipsRelations = relations(mentoringRelationships, ({ one }) => ({
  mentor: one(users, {
    fields: [mentoringRelationships.mentorId],
    references: [users.id],
  }),
  mentee: one(users, {
    fields: [mentoringRelationships.menteeId],
    references: [users.id],
  }),
}));

export type MentoringRelationship = typeof mentoringRelationships.$inferSelect;
export type NewMentoringRelationship = typeof mentoringRelationships.$inferInsert; 