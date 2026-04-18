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
    // Minimum hours before session when cancellation is still allowed (MENTEE)
    CANCELLATION_CUTOFF_HOURS: {
        key: 'cancellation_cutoff_hours',
        value: '2',
        type: 'integer',
        description: 'Minimum hours before session to allow mentee cancellation',
    },
    // Minimum hours before session when rescheduling is still allowed (MENTEE)
    RESCHEDULE_CUTOFF_HOURS: {
        key: 'reschedule_cutoff_hours',
        value: '4',
        type: 'integer',
        description: 'Minimum hours before session to allow mentee rescheduling',
    },
    // Maximum number of reschedules per session (MENTEE)
    MAX_RESCHEDULES_PER_SESSION: {
        key: 'max_reschedules_per_session',
        value: '2',
        type: 'integer',
        description: 'Maximum number of times a mentee can reschedule a session',
    },
    // Minimum hours before session when cancellation is still allowed (MENTOR)
    MENTOR_CANCELLATION_CUTOFF_HOURS: {
        key: 'mentor_cancellation_cutoff_hours',
        value: '1',
        type: 'integer',
        description: 'Minimum hours before session to allow mentor cancellation',
    },
    // Minimum hours before session when rescheduling is still allowed (MENTOR)
    MENTOR_RESCHEDULE_CUTOFF_HOURS: {
        key: 'mentor_reschedule_cutoff_hours',
        value: '2',
        type: 'integer',
        description: 'Minimum hours before session to allow mentor rescheduling',
    },
    // Maximum number of reschedules per session (MENTOR)
    MENTOR_MAX_RESCHEDULES_PER_SESSION: {
        key: 'mentor_max_reschedules_per_session',
        value: '2',
        type: 'integer',
        description: 'Maximum number of times a mentor can reschedule a session',
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
    // Refund percentage when mentee cancels between free and cutoff hours
    PARTIAL_REFUND_PERCENTAGE: {
        key: 'partial_refund_percentage',
        value: '70',
        type: 'integer',
        description: 'Refund % when mentee cancels between free_cancellation_hours and cancellation_cutoff_hours',
    },
    // Refund percentage when mentee cancels after cutoff (late cancellation)
    LATE_CANCELLATION_REFUND_PERCENTAGE: {
        key: 'late_cancellation_refund_percentage',
        value: '0',
        type: 'integer',
        description: 'Refund % when mentee cancels after cancellation_cutoff_hours',
    },
    // Reschedule request expiry time
    RESCHEDULE_REQUEST_EXPIRY_HOURS: {
        key: 'reschedule_request_expiry_hours',
        value: '48',
        type: 'integer',
        description: 'Hours until reschedule request auto-expires',
    },
    // Maximum counter proposals allowed
    MAX_COUNTER_PROPOSALS: {
        key: 'max_counter_proposals',
        value: '3',
        type: 'integer',
        description: 'Maximum rounds of counter-proposals allowed per reschedule request',
    },
} as const;

// Cancellation reason categories for MENTEES
export const CANCELLATION_REASONS = [
    { value: 'schedule_conflict', label: 'Schedule conflict' },
    { value: 'personal_emergency', label: 'Personal emergency' },
    { value: 'no_longer_needed', label: 'No longer need this session' },
    { value: 'found_alternative', label: 'Found alternative solution' },
    { value: 'technical_issues', label: 'Technical issues expected' },
    { value: 'other', label: 'Other' },
] as const;

// Cancellation reason categories for MENTORS
export const MENTOR_CANCELLATION_REASONS = [
    { value: 'schedule_conflict', label: 'Schedule conflict' },
    { value: 'personal_emergency', label: 'Personal emergency' },
    { value: 'preparation_issue', label: 'Unable to prepare for session' },
    { value: 'health_related', label: 'Health-related reason' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'unavailable', label: 'No longer available' },
    { value: 'other', label: 'Other' },
] as const;

export type CancellationReasonValue = typeof CANCELLATION_REASONS[number]['value'];
export type MentorCancellationReasonValue = typeof MENTOR_CANCELLATION_REASONS[number]['value'];

