import { pgTable, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';


export const users = pgTable('users', {
  // BetterAuth compatible fields
  id: text('id').primaryKey(), // BetterAuth expects text ID
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name'),
  image: text('image'),
  
  // OAuth fields
  googleId: text('google_id').unique(),
  
  // Extended profile information
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  bio: text('bio'),
  timezone: text('timezone').default('UTC'),
  
  // Account status
  isActive: boolean('is_active').default(true),
  isBlocked: boolean('is_blocked').default(false),
  
  // Timestamps - BetterAuth compatible names
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert; 