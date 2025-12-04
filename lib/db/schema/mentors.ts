import { pgTable, text, timestamp, boolean, integer, decimal, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Define verification status enum
export const verificationStatusEnum = pgEnum('verification_status', [
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'VERIFIED',
  'REJECTED',
  'REVERIFICATION',
  'RESUBMITTED',
  'UPDATED_PROFILE'
]);

export const mentors = pgTable('mentors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Professional information
  title: text('title'), // e.g., "Senior Software Engineer"
  company: text('company'),
  industry: text('industry'),
  expertise: text('expertise'), // JSON array of expertise areas
  experience: integer('experience_years'), // Years of experience
  
  // Mentoring details
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  availability: text('availability'), // JSON for availability schedule
  maxMentees: integer('max_mentees').default(10),
  
  // Profile details
  headline: text('headline'), // Short professional headline
  about: text('about'), // Detailed about section
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  websiteUrl: text('website_url'),
  
  // New registration fields
  fullName: text('full_name'),
  email: text('email'),
  phone: text('phone'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  profileImageUrl: text('profile_image_url'), // URL to uploaded profile picture
  resumeUrl: text('resume_url'), // URL to uploaded resume
  
  // Verification and status
  verificationStatus: verificationStatusEnum('verification_status').default('YET_TO_APPLY').notNull(),
  verificationNotes: text('verification_notes'), // Admin notes for rejected/reverification requests
  isAvailable: boolean('is_available').default(true),
  paymentStatus: text('payment_status').default('PENDING').notNull(),
  couponCode: text('coupon_code'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const mentorsRelations = relations(mentors, ({ one }) => ({
  user: one(users, {
    fields: [mentors.userId],
    references: [users.id],
  }),
}));

export type Mentor = typeof mentors.$inferSelect;
export type NewMentor = typeof mentors.$inferInsert;
export type VerificationStatus = typeof verificationStatusEnum.enumValues[number];
