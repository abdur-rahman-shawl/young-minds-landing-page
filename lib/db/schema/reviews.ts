import { pgTable, text, timestamp, uuid, integer, decimal, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

// Enum for reviewer roles to ensure type safety
export const reviewerRoleEnum = pgEnum('reviewer_role', ['mentor', 'mentee']);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  revieweeId: text('reviewee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reviewerRole: reviewerRoleEnum('reviewer_role').notNull(),
  
  // This will store the final calculated weighted score
  finalScore: decimal('final_score', { precision: 3, scale: 2 }).notNull(),
  
  // Optional text feedback
  feedback: text('feedback'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure that a reviewer can only review a session once
    sessionReviewerIndex: uniqueIndex('session_reviewer_idx').on(table.sessionId, table.reviewerId),
  };
});

export const reviewQuestions = pgTable('review_questions', {
    id: uuid('id').defaultRandom().primaryKey(),
    questionText: text('question_text').notNull(),
    // The role this question is intended for (the person being reviewed)
    role: reviewerRoleEnum('role').notNull(), 
    weight: decimal('weight', { precision: 4, scale: 2 }).notNull(), // e.g., 0.25 for 25%
    isActive: text('is_active').default('true').notNull(),
    // To maintain the order of questions in the UI
    displayOrder: integer('display_order').notNull().default(0),
});

export const reviewRatings = pgTable('review_ratings', {
    id: uuid('id').defaultRandom().primaryKey(),
    reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => reviewQuestions.id, { onDelete: 'cascade' }).notNull(),
    rating: integer('rating').notNull(), // 1-5 stars
});

// Relations
export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  session: one(sessions, {
    fields: [reviews.sessionId],
    references: [sessions.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: 'reviewer',
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: 'reviewee',
  }),
  ratings: many(reviewRatings),
}));

export const reviewQuestionsRelations = relations(reviewQuestions, ({ many }) => ({
    ratings: many(reviewRatings),
}));

export const reviewRatingsRelations = relations(reviewRatings, ({ one }) => ({
    review: one(reviews, {
        fields: [reviewRatings.reviewId],
        references: [reviews.id],
    }),
    question: one(reviewQuestions, {
        fields: [reviewRatings.questionId],
        references: [reviewQuestions.id],
    }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewQuestion = typeof reviewQuestions.$inferSelect;
export type NewReviewQuestion = typeof reviewQuestions.$inferInsert;
export type ReviewRating = typeof reviewRatings.$inferSelect;
export type NewReviewRating = typeof reviewRatings.$inferInsert;