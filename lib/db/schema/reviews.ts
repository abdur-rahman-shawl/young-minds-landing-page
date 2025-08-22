import { pgTable, text, timestamp, uuid, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  revieweeId: text('reviewee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Review details
  rating: integer('rating').notNull(), // 1-5 star rating
  comment: text('comment'),
  
  // Review type
  reviewerRole: text('reviewer_role').notNull(), // 'mentor' or 'mentee'
  
  // Review categories (optional detailed ratings)
  communicationRating: integer('communication_rating'), // 1-5
  knowledgeRating: integer('knowledge_rating'), // 1-5
  helpfulnessRating: integer('helpfulness_rating'), // 1-5
  professionalismRating: integer('professionalism_rating'), // 1-5
  
  // Response from reviewee (optional)
  response: text('response'),
  respondedAt: timestamp('responded_at'),
  
  // Flags
  isPublic: text('is_public').default('true').notNull(), // Whether review is publicly visible
  isVerified: text('is_verified').default('false').notNull(), // Whether the session was verified completed
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  session: one(sessions, {
    fields: [reviews.sessionId],
    references: [sessions.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;