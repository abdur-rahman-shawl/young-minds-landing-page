import { pgTable, text, timestamp, boolean, integer, decimal, pgEnum, uuid, jsonb, time } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mentors } from './mentors';

// Enum for recurrence patterns
export const recurrencePatternEnum = pgEnum('recurrence_pattern', [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'CUSTOM'
]);

// Enum for availability block types
export const availabilityTypeEnum = pgEnum('availability_type', [
  'AVAILABLE',
  'BREAK',
  'BUFFER',
  'BLOCKED'
]);

// Main availability schedule table
export const mentorAvailabilitySchedules = pgTable('mentor_availability_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id').references(() => mentors.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Global settings
  timezone: text('timezone').notNull().default('UTC'),
  defaultSessionDuration: integer('default_session_duration').notNull().default(60), // in minutes
  bufferTimeBetweenSessions: integer('buffer_time').notNull().default(15), // in minutes
  
  // Booking constraints
  minAdvanceBookingHours: integer('min_advance_booking_hours').notNull().default(24),
  maxAdvanceBookingDays: integer('max_advance_booking_days').notNull().default(90),
  
  // Business hours defaults
  defaultStartTime: time('default_start_time').default('09:00:00'),
  defaultEndTime: time('default_end_time').default('17:00:00'),
  
  // Flags
  isActive: boolean('is_active').notNull().default(true),
  allowInstantBooking: boolean('allow_instant_booking').notNull().default(true),
  requireConfirmation: boolean('require_confirmation').notNull().default(false),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Weekly recurring patterns
export const mentorWeeklyPatterns = pgTable('mentor_weekly_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').references(() => mentorAvailabilitySchedules.id, { onDelete: 'cascade' }).notNull(),
  
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
  isEnabled: boolean('is_enabled').notNull().default(true),
  
  // Time blocks for this day (stored as JSON array)
  timeBlocks: jsonb('time_blocks').notNull().default('[]'),
  /* Example structure:
  [
    {
      startTime: "09:00",
      endTime: "12:00",
      type: "AVAILABLE",
      maxBookings: 1
    },
    {
      startTime: "12:00",
      endTime: "13:00",
      type: "BREAK"
    },
    {
      startTime: "13:00",
      endTime: "17:00",
      type: "AVAILABLE",
      maxBookings: 1
    }
  ]
  */
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Availability exceptions (holidays, vacations, special dates)
export const mentorAvailabilityExceptions = pgTable('mentor_availability_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').references(() => mentorAvailabilitySchedules.id, { onDelete: 'cascade' }).notNull(),
  
  // Date range for the exception
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  
  // Exception details
  type: availabilityTypeEnum('type').notNull().default('BLOCKED'),
  reason: text('reason'),
  isFullDay: boolean('is_full_day').notNull().default(true),
  
  // If not full day, specific time blocks
  timeBlocks: jsonb('time_blocks'), // Same structure as weekly patterns
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Availability templates for quick setup
export const availabilityTemplates = pgTable('availability_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id').references(() => mentors.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  description: text('description'),
  isGlobal: boolean('is_global').notNull().default(false), // System templates vs personal templates
  
  // Template configuration
  configuration: jsonb('configuration').notNull(),
  /* Example structure:
  {
    timezone: "America/New_York",
    defaultSessionDuration: 60,
    bufferTime: 15,
    weeklyPatterns: [
      {
        dayOfWeek: 1,
        timeBlocks: [...]
      }
    ]
  }
  */
  
  // Usage tracking
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Special availability rules (e.g., different rates for different times)
export const mentorAvailabilityRules = pgTable('mentor_availability_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').references(() => mentorAvailabilitySchedules.id, { onDelete: 'cascade' }).notNull(),
  
  name: text('name').notNull(),
  description: text('description'),
  
  // Rule conditions
  conditions: jsonb('conditions').notNull(),
  /* Example:
  {
    daysOfWeek: [0, 6], // Weekends
    timeRange: { start: "18:00", end: "22:00" }, // Evening hours
    dateRange: { start: "2024-12-20", end: "2024-12-31" } // Holiday season
  }
  */
  
  // Rule actions
  actions: jsonb('actions').notNull(),
  /* Example:
  {
    priceMultiplier: 1.5, // 50% higher rate
    maxBookings: 2, // Allow double booking
    requireConfirmation: true
  }
  */
  
  priority: integer('priority').notNull().default(0), // Higher priority rules override lower ones
  isActive: boolean('is_active').notNull().default(true),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const mentorAvailabilitySchedulesRelations = relations(mentorAvailabilitySchedules, ({ one, many }) => ({
  mentor: one(mentors, {
    fields: [mentorAvailabilitySchedules.mentorId],
    references: [mentors.id],
  }),
  weeklyPatterns: many(mentorWeeklyPatterns),
  exceptions: many(mentorAvailabilityExceptions),
  rules: many(mentorAvailabilityRules),
}));

export const mentorWeeklyPatternsRelations = relations(mentorWeeklyPatterns, ({ one }) => ({
  schedule: one(mentorAvailabilitySchedules, {
    fields: [mentorWeeklyPatterns.scheduleId],
    references: [mentorAvailabilitySchedules.id],
  }),
}));

export const mentorAvailabilityExceptionsRelations = relations(mentorAvailabilityExceptions, ({ one }) => ({
  schedule: one(mentorAvailabilitySchedules, {
    fields: [mentorAvailabilityExceptions.scheduleId],
    references: [mentorAvailabilitySchedules.id],
  }),
}));

export const availabilityTemplatesRelations = relations(availabilityTemplates, ({ one }) => ({
  mentor: one(mentors, {
    fields: [availabilityTemplates.mentorId],
    references: [mentors.id],
  }),
}));

export const mentorAvailabilityRulesRelations = relations(mentorAvailabilityRules, ({ one }) => ({
  schedule: one(mentorAvailabilitySchedules, {
    fields: [mentorAvailabilityRules.scheduleId],
    references: [mentorAvailabilitySchedules.id],
  }),
}));

// Type exports
export type MentorAvailabilitySchedule = typeof mentorAvailabilitySchedules.$inferSelect;
export type NewMentorAvailabilitySchedule = typeof mentorAvailabilitySchedules.$inferInsert;

export type MentorWeeklyPattern = typeof mentorWeeklyPatterns.$inferSelect;
export type NewMentorWeeklyPattern = typeof mentorWeeklyPatterns.$inferInsert;

export type MentorAvailabilityException = typeof mentorAvailabilityExceptions.$inferSelect;
export type NewMentorAvailabilityException = typeof mentorAvailabilityExceptions.$inferInsert;

export type AvailabilityTemplate = typeof availabilityTemplates.$inferSelect;
export type NewAvailabilityTemplate = typeof availabilityTemplates.$inferInsert;

export type MentorAvailabilityRule = typeof mentorAvailabilityRules.$inferSelect;
export type NewMentorAvailabilityRule = typeof mentorAvailabilityRules.$inferInsert;

// Type for time blocks
export interface TimeBlock {
  startTime: string;
  endTime: string;
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
}

// Type for template configuration
export interface TemplateConfiguration {
  timezone: string;
  defaultSessionDuration: number;
  bufferTime: number;
  weeklyPatterns: {
    dayOfWeek: number;
    isEnabled: boolean;
    timeBlocks: TimeBlock[];
  }[];
}