import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const mentees = pgTable('mentees', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Professional background
  currentRole: text('current_role'), // e.g., "Student", "Junior Developer"
  currentCompany: text('current_company'),
  education: text('education'), // JSON for education details
  
  // Goals and interests
  careerGoals: text('career_goals'),
  interests: text('interests'), // JSON array of interest areas
  skillsToLearn: text('skills_to_learn'), // JSON array of skills they want to learn
  currentSkills: text('current_skills'), // JSON array of current skills
  
  // Learning preferences
  learningStyle: text('learning_style'), // e.g., "visual", "hands-on", "theoretical"
  preferredMeetingFrequency: text('preferred_meeting_frequency'), // e.g., "weekly", "bi-weekly"
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const menteesRelations = relations(mentees, ({ one }) => ({
  user: one(users, {
    fields: [mentees.userId],
    references: [users.id],
  }),
}));

export type Mentee = typeof mentees.$inferSelect;
export type NewMentee = typeof mentees.$inferInsert; 