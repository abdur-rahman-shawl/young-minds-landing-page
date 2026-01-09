import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Session Policies Table
 * 
 * Admin-configurable settings for session cancellation and rescheduling.
 * Allows dynamic policy management without code changes.
 */
export const sessionPolicies = pgTable('session_policies', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Policy identifier (unique key for lookup)
    policyKey: text('policy_key').notNull().unique(),

    // Policy value (stored as text, parsed based on policyType)
    policyValue: text('policy_value').notNull(),

    // Type hint for parsing: 'integer', 'boolean', 'string', 'json'
    policyType: text('policy_type').notNull().default('string'),

    // Human-readable description for admin UI
    description: text('description'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type SessionPolicy = typeof sessionPolicies.$inferSelect;
export type NewSessionPolicy = typeof sessionPolicies.$inferInsert;

// Default policy keys and values
export const DEFAULT_SESSION_POLICIES = {
    // Minimum hours before session when cancellation is still allowed
    CANCELLATION_CUTOFF_HOURS: {
        key: 'cancellation_cutoff_hours',
        value: '2',
        type: 'integer',
        description: 'Minimum hours before session to allow cancellation',
    },
    // Minimum hours before session when rescheduling is still allowed
    RESCHEDULE_CUTOFF_HOURS: {
        key: 'reschedule_cutoff_hours',
        value: '4',
        type: 'integer',
        description: 'Minimum hours before session to allow rescheduling',
    },
    // Maximum number of reschedules per session
    MAX_RESCHEDULES_PER_SESSION: {
        key: 'max_reschedules_per_session',
        value: '2',
        type: 'integer',
        description: 'Maximum number of times a session can be rescheduled',
    },
    // Hours before session for penalty-free cancellation
    FREE_CANCELLATION_HOURS: {
        key: 'free_cancellation_hours',
        value: '24',
        type: 'integer',
        description: 'Hours before session for penalty-free cancellation',
    },
    // Whether cancellation reason is required
    REQUIRE_CANCELLATION_REASON: {
        key: 'require_cancellation_reason',
        value: 'true',
        type: 'boolean',
        description: 'Whether a cancellation reason is mandatory',
    },
} as const;

// Cancellation reason categories (enum-like)
export const CANCELLATION_REASONS = [
    { value: 'schedule_conflict', label: 'Schedule conflict' },
    { value: 'personal_emergency', label: 'Personal emergency' },
    { value: 'no_longer_needed', label: 'No longer need this session' },
    { value: 'found_alternative', label: 'Found alternative solution' },
    { value: 'technical_issues', label: 'Technical issues expected' },
    { value: 'other', label: 'Other' },
] as const;

export type CancellationReasonValue = typeof CANCELLATION_REASONS[number]['value'];
