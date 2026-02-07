import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

/**
 * Admin Session Notes
 * Internal notes on sessions (not visible to users)
 */
export const adminSessionNotes = pgTable('admin_session_notes', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
    note: text('note').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminSessionNotesRelations = relations(adminSessionNotes, ({ one }) => ({
    admin: one(users, {
        fields: [adminSessionNotes.adminId],
        references: [users.id],
    }),
    session: one(sessions, {
        fields: [adminSessionNotes.sessionId],
        references: [sessions.id],
    }),
}));

export type AdminSessionNote = typeof adminSessionNotes.$inferSelect;
export type NewAdminSessionNote = typeof adminSessionNotes.$inferInsert;
