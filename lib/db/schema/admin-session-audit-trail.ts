import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

/**
 * Admin Session Audit Trail
 * Tracks all admin actions on sessions for accountability
 */
export const adminSessionAuditTrail = pgTable('admin_session_audit_trail', {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),

    // Action details
    action: text('action').notNull(),
    // Actions: ADMIN_FORCE_CANCEL, ADMIN_FORCE_COMPLETE, ADMIN_MANUAL_REFUND,
    //          ADMIN_REASSIGN_SESSION, ADMIN_CLEAR_NO_SHOW, ADMIN_POLICY_OVERRIDE,
    //          ADMIN_NOTE_ADDED, ADMIN_DISPUTE_RESOLVED

    previousStatus: text('previous_status'),
    newStatus: text('new_status'),
    reason: text('reason'),
    details: jsonb('details'),

    // Metadata
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminSessionAuditTrailRelations = relations(adminSessionAuditTrail, ({ one }) => ({
    admin: one(users, {
        fields: [adminSessionAuditTrail.adminId],
        references: [users.id],
    }),
    session: one(sessions, {
        fields: [adminSessionAuditTrail.sessionId],
        references: [sessions.id],
    }),
}));

export type AdminSessionAudit = typeof adminSessionAuditTrail.$inferSelect;
export type NewAdminSessionAudit = typeof adminSessionAuditTrail.$inferInsert;
