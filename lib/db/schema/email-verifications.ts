import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';

export const emailVerifications = pgTable('email_verifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    code: integer('code').notNull(),
    expiresAt: timestamp('expires_at', {withTimezone: true}).notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).defaultNow().notNull()
})