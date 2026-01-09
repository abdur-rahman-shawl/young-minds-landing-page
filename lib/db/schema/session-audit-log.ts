import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

/**
 * Session Audit Log Table
 * 
 * Tracks all cancellations and reschedules with full context.
 * Provides accountability and enables analytics on session modifications.
 */
export const sessionAuditLog = pgTable('session_audit_log', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Reference to the session
    sessionId: uuid('session_id')
        .references(() => sessions.id, { onDelete: 'cascade' })
        .notNull(),

    // User who performed the action
    userId: text('user_id')
        .references(() => users.id, { onDelete: 'set null' }),

    // Action type: 'cancel' or 'reschedule'
    action: text('action').notNull(),

    // Reason category (from predefined list)
    reasonCategory: text('reason_category'),

    // Additional reason details (free text)
    reasonDetails: text('reason_details'),

    // For reschedules: the original scheduled time
    previousScheduledAt: timestamp('previous_scheduled_at'),

    // For reschedules: the new scheduled time
    newScheduledAt: timestamp('new_scheduled_at'),

    // Snapshot of policies at time of action (for historical reference)
    policySnapshot: jsonb('policy_snapshot'),

    // IP address for security audit
    ipAddress: text('ip_address'),

    // User agent for security audit
    userAgent: text('user_agent'),

    // Timestamp
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const sessionAuditLogRelations = relations(sessionAuditLog, ({ one }) => ({
    session: one(sessions, {
        fields: [sessionAuditLog.sessionId],
        references: [sessions.id],
    }),
    user: one(users, {
        fields: [sessionAuditLog.userId],
        references: [users.id],
    }),
}));

// Type exports
export type SessionAuditLogEntry = typeof sessionAuditLog.$inferSelect;
export type NewSessionAuditLogEntry = typeof sessionAuditLog.$inferInsert;
