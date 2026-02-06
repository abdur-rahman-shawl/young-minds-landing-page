import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

/**
 * Reschedule Requests Table
 * 
 * Tracks reschedule negotiation between mentor and mentee.
 * Provides audit log for all reschedule activities.
 */
export const rescheduleRequests = pgTable('reschedule_requests', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Reference to the session being rescheduled
    sessionId: uuid('session_id')
        .references(() => sessions.id, { onDelete: 'cascade' })
        .notNull(),

    // Who initiated the reschedule request
    initiatedBy: text('initiated_by').notNull(), // 'mentor' | 'mentee'
    initiatorId: text('initiator_id')
        .references(() => users.id, { onDelete: 'set null' }),

    // Current status of the request
    status: text('status').notNull().default('pending'),
    // Status values: 'pending', 'accepted', 'rejected', 'counter_proposed', 'cancelled', 'expired'

    // Proposed new time
    proposedTime: timestamp('proposed_time').notNull(),
    proposedDuration: integer('proposed_duration'),

    // Original scheduled time (for reference)
    originalTime: timestamp('original_time').notNull(),

    // Counter-proposal tracking
    counterProposedTime: timestamp('counter_proposed_time'),
    counterProposedBy: text('counter_proposed_by'), // 'mentor' | 'mentee'
    counterProposalCount: integer('counter_proposal_count').default(0).notNull(),

    // Resolution details
    resolvedBy: text('resolved_by'), // 'mentor' | 'mentee' | 'system'
    resolverId: text('resolver_id')
        .references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at'),
    resolutionNote: text('resolution_note'),

    // For cancellation via reschedule flow
    cancellationReason: text('cancellation_reason'),

    // Expiry handling
    expiresAt: timestamp('expires_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const rescheduleRequestsRelations = relations(rescheduleRequests, ({ one }) => ({
    session: one(sessions, {
        fields: [rescheduleRequests.sessionId],
        references: [sessions.id],
    }),
    initiator: one(users, {
        fields: [rescheduleRequests.initiatorId],
        references: [users.id],
    }),
    resolver: one(users, {
        fields: [rescheduleRequests.resolverId],
        references: [users.id],
    }),
}));

// Type exports
export type RescheduleRequest = typeof rescheduleRequests.$inferSelect;
export type NewRescheduleRequest = typeof rescheduleRequests.$inferInsert;

// Status constants
export const RESCHEDULE_REQUEST_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    COUNTER_PROPOSED: 'counter_proposed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
} as const;

export type RescheduleRequestStatus = typeof RESCHEDULE_REQUEST_STATUS[keyof typeof RESCHEDULE_REQUEST_STATUS];
