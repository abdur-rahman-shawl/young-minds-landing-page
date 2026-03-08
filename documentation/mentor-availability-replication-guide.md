# Mentor Availability — Replication Guide

> **Purpose**: This document provides everything a senior developer needs to replicate the **Mentor Availability** feature in a separate Next.js codebase. It covers the database schema, API endpoints, frontend components, validation utilities, and data‑flow architecture.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Validation Utility](#6-validation-utility)
7. [Data‑Flow Walkthrough](#7-data-flow-walkthrough)
8. [Dependencies](#8-dependencies)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Feature Overview

The Mentor Availability feature allows mentors to:

- **Configure a weekly recurring schedule** (per-day time blocks with types: AVAILABLE, BREAK, BUFFER, BLOCKED)
- **Set global session settings** (timezone, session duration, buffer time, booking window, instant booking vs. manual confirmation)
- **Create date-specific exceptions** (vacations, holidays, conferences — full-day or partial-day)
- **Save and apply schedule templates** (4 premade templates + custom user-saved templates)
- **Expose bookable time slots** to mentees via slot-generation APIs that account for weekly patterns, exceptions, existing bookings, buffer times, and booking-window constraints

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Time blocks stored as JSONB in `mentor_weekly_patterns` | Avoids a separate time-blocks join table; each day has a self-contained array of blocks |
| Two slot-generation endpoints (`/available-slots` and `/slots`) | `/available-slots` returns only bookable slots; `/slots` returns all slots with `available: boolean` for calendar display |
| Exceptions are stored per-schedule, not per-mentor | Ensures exceptions are always tied to an existing availability schedule |
| Templates use `localStorage` on the frontend (with DB table ready) | Quick-start approach; production migration to DB is a simple swap |
| Validation runs both client-side and server-side | Client: `availability-validation.ts`; Server: Zod schemas + same validation utility |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│                                                                 │
│  MentorAvailabilityManager (orchestrator)                       │
│    ├── Tab: Schedule  → WeeklyScheduleEditor                   │
│    ├── Tab: Settings  → AvailabilitySettings                   │
│    ├── Tab: Exceptions → AvailabilityExceptions                │
│    └── Tab: Templates  → AvailabilityTemplates                 │
│                                                                 │
│  State: schedule (AvailabilitySchedule)                         │
│  Actions: save → PUT /api/mentors/[id]/availability             │
│           fetch → GET /api/mentors/[id]/availability            │
│                                                                 │
│  Exceptions: independent fetch/create/delete via                │
│    /api/mentors/[id]/availability/exceptions                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│                     API ROUTES (Next.js)                         │
│                                                                 │
│  /api/mentors/[id]/availability                                 │
│    GET  → fetch schedule + weekly patterns + exceptions + rules │
│    POST → create initial schedule (409 if exists)               │
│    PUT  → update schedule (transaction: upsert + delete/insert  │
│           weekly patterns)                                      │
│                                                                 │
│  /api/mentors/[id]/availability/exceptions                      │
│    GET    → list exceptions (optional date-range filter)        │
│    POST   → create exception (overlap check)                    │
│    DELETE → batch delete by IDs                                 │
│                                                                 │
│  /api/mentors/[id]/availability/available-slots                 │
│    GET → compute bookable slots for a date range                │
│                                                                 │
│  /api/mentors/[id]/availability/slots                           │
│    GET → compute all slots (available + unavailable) for        │
│          calendar display with timezone conversion               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Drizzle ORM
┌──────────────────────────▼──────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                        │
│                                                                 │
│  mentor_availability_schedules  (1:1 with mentors)              │
│  mentor_weekly_patterns         (1:many from schedules)         │
│  mentor_availability_exceptions (1:many from schedules)         │
│  availability_templates         (1:many from mentors, nullable) │
│  mentor_availability_rules      (1:many from schedules)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

**File**: `lib/db/schema/mentor-availability.ts`

### 3.1 Enums

```sql
CREATE TYPE recurrence_pattern AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE availability_type AS ENUM ('AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED');
```

Drizzle definition:

```typescript
export const recurrencePatternEnum = pgEnum('recurrence_pattern', [
  'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'
]);

export const availabilityTypeEnum = pgEnum('availability_type', [
  'AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED'
]);
```

### 3.2 `mentor_availability_schedules` — Main Settings

One row per mentor. Holds global configuration.

```typescript
export const mentorAvailabilitySchedules = pgTable('mentor_availability_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id')
    .references(() => mentors.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),

  // Global settings
  timezone: text('timezone').notNull().default('UTC'),
  defaultSessionDuration: integer('default_session_duration').notNull().default(60),
  bufferTimeBetweenSessions: integer('buffer_time').notNull().default(15),

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
```

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | UUID | auto | Primary key |
| `mentor_id` | UUID | — | FK → `mentors.id`, unique, cascade delete |
| `timezone` | text | `'UTC'` | IANA timezone string |
| `default_session_duration` | int | `60` | Minutes per session |
| `buffer_time` | int | `15` | Minutes between sessions |
| `min_advance_booking_hours` | int | `24` | Earliest a mentee can book (hours from now) |
| `max_advance_booking_days` | int | `90` | Latest a mentee can book (days from now) |
| `default_start_time` | time | `09:00:00` | Default business-hours start |
| `default_end_time` | time | `17:00:00` | Default business-hours end |
| `is_active` | bool | `true` | Master on/off switch |
| `allow_instant_booking` | bool | `true` | Can mentee book without approval? |
| `require_confirmation` | bool | `false` | Must mentor manually approve? |

### 3.3 `mentor_weekly_patterns` — Per-Day Schedules

One row per day-of-week per schedule. Time blocks stored as JSONB.

```typescript
export const mentorWeeklyPatterns = pgTable('mentor_weekly_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id')
    .references(() => mentorAvailabilitySchedules.id, { onDelete: 'cascade' })
    .notNull(),

  dayOfWeek: integer('day_of_week').notNull(), // 0=Sun … 6=Sat
  isEnabled: boolean('is_enabled').notNull().default(true),

  timeBlocks: jsonb('time_blocks').notNull().default('[]'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**`timeBlocks` JSONB structure**:

```json
[
  {
    "startTime": "09:00",
    "endTime": "12:00",
    "type": "AVAILABLE",
    "maxBookings": 1
  },
  {
    "startTime": "12:00",
    "endTime": "13:00",
    "type": "BREAK"
  },
  {
    "startTime": "13:00",
    "endTime": "17:00",
    "type": "AVAILABLE",
    "maxBookings": 1
  }
]
```

### 3.4 `mentor_availability_exceptions` — Date-Specific Overrides

```typescript
export const mentorAvailabilityExceptions = pgTable('mentor_availability_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id')
    .references(() => mentorAvailabilitySchedules.id, { onDelete: 'cascade' })
    .notNull(),

  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  type: availabilityTypeEnum('type').notNull().default('BLOCKED'),
  reason: text('reason'),
  isFullDay: boolean('is_full_day').notNull().default(true),

  timeBlocks: jsonb('time_blocks'), // Same structure as weekly patterns; null if full day

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.5 `availability_templates` — Saved Configurations

```typescript
export const availabilityTemplates = pgTable('availability_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id')
    .references(() => mentors.id, { onDelete: 'cascade' }), // nullable for global templates

  name: text('name').notNull(),
  description: text('description'),
  isGlobal: boolean('is_global').notNull().default(false),

  configuration: jsonb('configuration').notNull(),

  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**`configuration` JSONB structure**:

```json
{
  "timezone": "America/New_York",
  "defaultSessionDuration": 60,
  "bufferTime": 15,
  "minAdvanceBookingHours": 24,
  "maxAdvanceBookingDays": 90,
  "allowInstantBooking": true,
  "requireConfirmation": false,
  "weeklyPatterns": [
    {
      "dayOfWeek": 1,
      "isEnabled": true,
      "timeBlocks": [
        { "startTime": "09:00", "endTime": "12:00", "type": "AVAILABLE" },
        { "startTime": "12:00", "endTime": "13:00", "type": "BREAK" },
        { "startTime": "13:00", "endTime": "17:00", "type": "AVAILABLE" }
      ]
    }
  ]
}
```

### 3.6 `mentor_availability_rules` — Advanced Rules (Optional)

```typescript
export const mentorAvailabilityRules = pgTable('mentor_availability_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id')
    .references(() => mentorAvailabilitySchedules.id, { onDelete: 'cascade' })
    .notNull(),

  name: text('name').notNull(),
  description: text('description'),

  conditions: jsonb('conditions').notNull(),
  // Example: { daysOfWeek: [0,6], timeRange: { start: "18:00", end: "22:00" } }

  actions: jsonb('actions').notNull(),
  // Example: { priceMultiplier: 1.5, maxBookings: 2, requireConfirmation: true }

  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.7 Relations

```typescript
// Schedule → mentor (1:1), weeklyPatterns (1:many), exceptions (1:many), rules (1:many)
export const mentorAvailabilitySchedulesRelations = relations(
  mentorAvailabilitySchedules,
  ({ one, many }) => ({
    mentor: one(mentors, {
      fields: [mentorAvailabilitySchedules.mentorId],
      references: [mentors.id],
    }),
    weeklyPatterns: many(mentorWeeklyPatterns),
    exceptions: many(mentorAvailabilityExceptions),
    rules: many(mentorAvailabilityRules),
  })
);

// WeeklyPattern → schedule
export const mentorWeeklyPatternsRelations = relations(
  mentorWeeklyPatterns,
  ({ one }) => ({
    schedule: one(mentorAvailabilitySchedules, {
      fields: [mentorWeeklyPatterns.scheduleId],
      references: [mentorAvailabilitySchedules.id],
    }),
  })
);

// Exception → schedule
export const mentorAvailabilityExceptionsRelations = relations(
  mentorAvailabilityExceptions,
  ({ one }) => ({
    schedule: one(mentorAvailabilitySchedules, {
      fields: [mentorAvailabilityExceptions.scheduleId],
      references: [mentorAvailabilitySchedules.id],
    }),
  })
);

// Template → mentor (nullable)
export const availabilityTemplatesRelations = relations(
  availabilityTemplates,
  ({ one }) => ({
    mentor: one(mentors, {
      fields: [availabilityTemplates.mentorId],
      references: [mentors.id],
    }),
  })
);

// Rule → schedule
export const mentorAvailabilityRulesRelations = relations(
  mentorAvailabilityRules,
  ({ one }) => ({
    schedule: one(mentorAvailabilitySchedules, {
      fields: [mentorAvailabilityRules.scheduleId],
      references: [mentorAvailabilitySchedules.id],
    }),
  })
);
```

### 3.8 Type Exports

```typescript
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

export interface TimeBlock {
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
}

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
```

---

## 4. API Endpoints

### 4.1 Main Availability CRUD

**File**: `app/api/mentors/[id]/availability/route.ts`

#### `GET /api/mentors/[id]/availability`

Fetches the mentor's full availability configuration.

- **Auth**: Session required (reads `auth.api.getSession`)
- **Path Params**: `id` = user ID of the mentor
- **Query Params** (optional): `startDate`, `endDate` — filter exceptions by date range
- **Logic**:
  1. Look up `mentors` by `userId = id`
  2. Query `mentor_availability_schedules` by `mentorId = mentor.id`
  3. If no schedule → return `{ schedule: null, weeklyPatterns: [], exceptions: [], rules: [] }`
  4. Fetch `mentor_weekly_patterns` by `scheduleId`
  5. Fetch `mentor_availability_exceptions` by `scheduleId` (optionally filtered)
  6. Fetch active `mentor_availability_rules` by `scheduleId`
- **Response** (200):

```json
{
  "success": true,
  "schedule": { /* MentorAvailabilitySchedule row */ },
  "weeklyPatterns": [ /* MentorWeeklyPattern rows */ ],
  "exceptions": [ /* MentorAvailabilityException rows */ ],
  "rules": [ /* MentorAvailabilityRule rows */ ]
}
```

#### `POST /api/mentors/[id]/availability`

Creates the initial availability schedule. Returns `409` if one already exists.

- **Auth**: Session required; `mentor.userId === session.user.id`
- **Body**: validated via Zod schema `availabilityScheduleSchema` (see below)
- **Validations**:
  1. Zod schema (time format, ranges, enums)
  2. Per-day time-block overlap detection via `validateTimeBlock()`
  3. Full-schedule validation via `validateWeeklySchedule()`
- **Logic** (in a transaction):
  1. Insert into `mentor_availability_schedules`
  2. Insert rows into `mentor_weekly_patterns` (one per day-of-week entry)
- **Response** (200): `{ success: true, schedule: {...}, message: "..." }`

#### `PUT /api/mentors/[id]/availability`

Updates an existing availability schedule.

- **Auth**: Same as POST
- **Body**: Same Zod schema
- **Logic** (in a transaction):
  1. If schedule exists → update `mentor_availability_schedules`, then delete all `mentor_weekly_patterns` for this schedule and re-insert
  2. If schedule does not exist → create new (same as POST)
- **Response** (200): `{ success: true, message: "Availability updated successfully" }`

##### Zod Validation Schemas

```typescript
const timeBlockSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']),
  maxBookings: z.number().min(1).optional(),
});

const weeklyPatternSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  isEnabled: z.boolean(),
  timeBlocks: z.array(timeBlockSchema),
}).refine(
  (data) => {
    if (!data.isEnabled || data.timeBlocks.length === 0) return true;
    for (let i = 0; i < data.timeBlocks.length; i++) {
      const block = data.timeBlocks[i];
      const otherBlocks = data.timeBlocks.filter((_, index) => index !== i);
      const validation = validateTimeBlock(block, otherBlocks);
      if (!validation.isValid) return false;
    }
    return true;
  },
  { message: "Time blocks contain overlapping periods." }
);

const availabilityScheduleSchema = z.object({
  timezone: z.string(),
  defaultSessionDuration: z.number().min(15).max(240),
  bufferTimeBetweenSessions: z.number().min(0).max(60),
  minAdvanceBookingHours: z.number().min(0).max(168),
  maxAdvanceBookingDays: z.number().min(1).max(365),
  defaultStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
  defaultEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
  isActive: z.boolean(),
  allowInstantBooking: z.boolean(),
  requireConfirmation: z.boolean(),
  weeklyPatterns: z.array(weeklyPatternSchema),
});
```

---

### 4.2 Exceptions CRUD

**File**: `app/api/mentors/[id]/availability/exceptions/route.ts`

#### `GET /api/mentors/[id]/availability/exceptions`

- **Query Params** (optional): `startDate`, `endDate`
- **Logic**: Look up mentor → schedule → exceptions (optionally filtered)
- **Response**: `{ success: true, exceptions: [...] }`

#### `POST /api/mentors/[id]/availability/exceptions`

- **Auth**: Session required; must be own mentor
- **Body** (Zod validated):

```typescript
const exceptionSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']).default('BLOCKED'),
  reason: z.string().optional(),
  isFullDay: z.boolean().default(true),
  timeBlocks: z.array(z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    type: z.enum(['AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED']),
  })).optional(),
});
```

- **Validations**: Date order check + overlap check against existing exceptions (returns `409` if overlap)
- **Response**: `{ success: true, exception: {...} }`

#### `DELETE /api/mentors/[id]/availability/exceptions`

- **Auth**: Session required; must be own mentor
- **Body**: `{ exceptionIds: string[] }` (array of UUIDs)
- **Logic**: Transaction deletes only exceptions belonging to this schedule
- **Response**: `{ success: true, deletedCount: N }`

---

### 4.3 Slot Generation — Available Slots

**File**: `app/api/mentors/[id]/availability/available-slots/route.ts`

#### `GET /api/mentors/[id]/availability/available-slots`

Returns only **bookable** time slots for a date range (used by the booking UI).

- **Query Params**: `startDate` (required), `endDate` (required)
- **Max range**: 90 days
- **Algorithm**:
  1. Fetch schedule, weekly patterns, exceptions, existing `sessions` (status = `'scheduled'`)
  2. For each day in range:
     a. Find the weekly pattern for that day-of-week
     b. Skip if day is disabled or falls within a BLOCKED exception
     c. Separate AVAILABLE blocks from BREAK/BUFFER/BLOCKED blocks
     d. Call `applyBlockedTimes(availableBlocks, blockedBlocks)` to fragment available periods
     e. For each effective available block, generate slots at `sessionDuration` intervals
     f. Skip slots outside the booking window (`minAdvanceBookingHours` … `maxAdvanceBookingDays`)
     g. Check each slot against existing bookings (with buffer padding on both sides)
     h. If no conflict → add to results
  3. Sort by `startTime`
- **Response**:

```json
{
  "success": true,
  "slots": [
    { "startTime": "2024-03-15T09:00:00.000Z", "endTime": "2024-03-15T10:00:00.000Z", "available": true }
  ],
  "sessionDuration": 60,
  "timezone": "America/New_York",
  "disabledDays": [0, 6],
  "total": 42
}
```

### 4.4 Slot Generation — All Slots (Calendar View)

**File**: `app/api/mentors/[id]/availability/slots/route.ts`

#### `GET /api/mentors/[id]/availability/slots`

Returns **all** slots (available + unavailable with reasons) for calendar display.

- **Query Params**: `startDate`, `endDate`, `duration` (optional, defaults to schedule default), `timezone` (optional)
- **Algorithm** similar to available-slots but:
  - Generates slots at 30-minute intervals
  - Includes unavailable slots with `reason` field (e.g., "Already booked", "Unavailable")
  - Performs timezone conversion if `timezone` differs from mentor's timezone (uses `date-fns-tz`)
- **Response**:

```json
{
  "success": true,
  "slots": [
    { "startTime": "...", "endTime": "...", "available": true },
    { "startTime": "...", "endTime": "...", "available": false, "reason": "Already booked" }
  ],
  "mentorTimezone": "America/New_York",
  "requestedTimezone": "UTC",
  "sessionDuration": 60,
  "bufferTime": 15
}
```

---

## 5. Frontend Components

### 5.1 Component Tree

```
MentorAvailabilityManager (orchestrator)
├── Tabs
│   ├── "Schedule"   → WeeklyScheduleEditor
│   ├── "Settings"   → AvailabilitySettings
│   ├── "Exceptions" → AvailabilityExceptions
│   └── "Templates"  → AvailabilityTemplates
├── Save / Reset buttons (sticky footer)
└── Unsaved changes indicator
```

### 5.2 `MentorAvailabilityManager`

**File**: `components/mentor/availability/mentor-availability-manager.tsx` (497 lines)

**Props**: `mentorId: string`

**Responsibilities**:
- Fetches the full availability schedule on mount via `GET /api/mentors/[mentorId]/availability`
- Manages the `schedule` state object (type `AvailabilitySchedule`)
- Tracks `hasChanges` by deep-comparing current state vs. `originalSchedule`
- Provides `handleSave()` → `PUT /api/mentors/[mentorId]/availability`
- Provides `handleReset()` → reverts state to `originalSchedule`
- Passes update callbacks to child components

**State shape** (`AvailabilitySchedule`):

```typescript
interface AvailabilitySchedule {
  timezone: string;
  defaultSessionDuration: number;
  bufferTimeBetweenSessions: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isActive: boolean;
  allowInstantBooking: boolean;
  requireConfirmation: boolean;
  weeklyPatterns: WeeklyPattern[];
}

interface WeeklyPattern {
  dayOfWeek: number;   // 0-6 (Sun-Sat)
  isEnabled: boolean;
  timeBlocks: TimeBlock[];
}

interface TimeBlock {
  startTime: string;   // "HH:MM"
  endTime: string;
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
}
```

**Default schedule** (initalized when no schedule exists):

```typescript
const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  defaultSessionDuration: 60,
  bufferTimeBetweenSessions: 15,
  minAdvanceBookingHours: 24,
  maxAdvanceBookingDays: 90,
  defaultStartTime: '09:00:00',
  defaultEndTime: '17:00:00',
  isActive: true,
  allowInstantBooking: true,
  requireConfirmation: false,
  weeklyPatterns: [0,1,2,3,4,5,6].map(day => ({
    dayOfWeek: day,
    isEnabled: day >= 1 && day <= 5, // Mon-Fri enabled by default
    timeBlocks: (day >= 1 && day <= 5) ? [
      { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE', maxBookings: 1 },
      { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
      { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE', maxBookings: 1 }
    ] : []
  }))
};
```

**Key callbacks passed to children**:

| Callback | Target Component | Purpose |
|---|---|---|
| `updateSchedule(updates: Partial<AvailabilitySchedule>)` | `AvailabilitySettings` | Updates top-level settings |
| `updateWeeklyPattern(dayOfWeek, pattern: Partial<WeeklyPattern>)` | `WeeklyScheduleEditor` | Updates a specific day's pattern |
| `onApplyTemplate(template)` | `AvailabilityTemplates` | Replaces entire schedule with template config |

---

### 5.3 `WeeklyScheduleEditor`

**File**: `components/mentor/availability/weekly-schedule-editor.tsx` (527 lines)

**Props**:

```typescript
interface WeeklyScheduleEditorProps {
  weeklyPatterns: WeeklyPattern[];
  onPatternChange: (dayOfWeek: number, pattern: Partial<WeeklyPattern>) => void;
  timezone: string;
}
```

**Features**:

| Feature | Details |
|---|---|
| Day toggle | `Switch` to enable/disable each day |
| Quick actions | "Reset Weekdays (9-5)", "Reset Weekends", "Reset All Days" buttons |
| Time block display | Color-coded cards: green=AVAILABLE, amber=BREAK, blue=BUFFER, red=BLOCKED |
| Add/Edit block | Opens a `Dialog` with start time, end time, block type selector, max bookings input |
| Delete block | Removes from the day's array |
| Copy to all | Copies one day's schedule to all other days |
| Validation | Calls `validateTimeBlock()` before saving; shows inline errors |
| Merge & sort | Calls `mergeAndSortTimeBlocks()` after save to clean up adjacent AVAILABLE blocks |

**Block type styling map**:

```typescript
const BLOCK_TYPE_LABELS = {
  AVAILABLE: { label: 'Available', icon: Check, color: 'text-green-600 ...' },
  BREAK:     { label: 'Break',     icon: Coffee, color: 'text-amber-600 ...' },
  BUFFER:    { label: 'Buffer',    icon: Clock, color: 'text-blue-600 ...' },
  BLOCKED:   { label: 'Blocked',   icon: AlertCircle, color: 'text-red-600 ...' },
};
```

---

### 5.4 `AvailabilitySettings`

**File**: `components/mentor/availability/availability-settings.tsx` (338 lines)

**Props**:

```typescript
interface AvailabilitySettingsProps {
  schedule: AvailabilitySchedule;
  onUpdate: (updates: Partial<AvailabilitySchedule>) => void;
}
```

**UI — 4 Cards**:

1. **Time Zone** — `Select` with 13 common IANA timezones
2. **Session Configuration** — Session duration (`Select`: 15m–4h) + buffer time (`Select`: 0–60m)
3. **Booking Window** — Min advance notice (`Input` in hours, 0–168) + max advance booking (`Input` in days, 1–365)
4. **Booking Preferences** — Instant booking toggle + require confirmation toggle (with info alert)
5. **Default Business Hours** — Default start/end time inputs

**Timezone list provided**:

```typescript
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];
```

---

### 5.5 `AvailabilityExceptions`

**File**: `components/mentor/availability/availability-exceptions.tsx` (491 lines)

**Props**: `mentorId?: string`

**This component manages its own data independently** — it does NOT share state with the parent. It fetches, creates, and deletes exceptions directly via the `/api/mentors/[id]/availability/exceptions` endpoint.

**Features**:

| Feature | Details |
|---|---|
| Quick-add buttons | "Vacation" (7 days), "Public Holiday" (1 day), "Conference" (3 days) |
| Exception list | Cards with icon, reason, type badge, date range, partial-day indicator |
| Add dialog | Calendar (multi-date select), type selector, full-day toggle, time range (if partial), reason textarea |
| Delete | Per-exception delete button (hover reveal) |
| Loading state | Spinner while fetching |
| Empty state | Illustrated empty state with message |

**Exception form state**:

```typescript
const [exceptionForm, setExceptionForm] = useState({
  type: 'BLOCKED' as Exception['type'],
  reason: '',
  isFullDay: true,
  startTime: '09:00',
  endTime: '17:00'
});
```

---

### 5.6 `AvailabilityTemplates`

**File**: `components/mentor/availability/availability-templates.tsx` (508 lines)

**Props**:

```typescript
interface AvailabilityTemplatesProps {
  currentSchedule: any;
  onApplyTemplate: (template: Template) => void;
}
```

**Features**:

- **Save current as template** — Opens dialog with name + description → saves to `localStorage`
- **4 premade templates**: "Standard Business Hours", "Evening Mentor", "Weekend Warrior", "Flexible Schedule"
- **Custom templates** — Loaded from `localStorage`, can be applied or deleted
- **Apply** — Calls `onApplyTemplate()` which replaces `schedule` state in parent

**Premade templates summary**:

| Template | Days | Hours | Duration | Buffer |
|---|---|---|---|---|
| Standard Business Hours | Mon–Fri | 9 AM – 5 PM (lunch break) | 60 min | 15 min |
| Evening Mentor | Mon–Fri | 6 PM – 9 PM | 60 min | 10 min |
| Weekend Warrior | Sat, Sun | 10 AM – 4 PM (lunch break) | 45 min | 15 min |
| Flexible Schedule | All 7 days | Varies per day | 30 min | 10 min |

---

## 6. Validation Utility

**File**: `lib/utils/availability-validation.ts` (344 lines)

This utility is used both client-side (in `WeeklyScheduleEditor`) and server-side (in the API route).

### Exported Functions

#### `validateTimeBlock(newBlock, existingBlocks, allowedOverlapTypes?)`

Validates a single time block against existing blocks on the same day.

- Checks time format (`HH:MM`)
- Validates end time > start time
- Detects overlaps with existing blocks, categorized as:
  - `full` — exact same time range
  - `contains` — new block fully contains existing
  - `contained` — new block is fully inside existing
  - `partial` — partial overlap

Returns `{ isValid: boolean, errors: string[], overlaps: TimeBlockOverlap[] }`

#### `mergeAndSortTimeBlocks(blocks)`

Sorts blocks by start time, then merges adjacent/overlapping AVAILABLE blocks (only if they have the same `maxBookings`).

#### `applyBlockedTimes(availableBlocks, blockedBlocks)`

Takes available blocks and "subtracts" blocked/break periods by fragmenting the available blocks around blocked ones. Used by the slot-generation API to calculate effective availability.

**Algorithm**:
1. For each available block, start with one fragment `[start, end]`
2. For each blocked block that overlaps, split the fragment:
   - Keep `[fragmentStart, blockedStart]` if fragment starts before blocked
   - Keep `[blockedEnd, fragmentEnd]` if fragment ends after blocked
3. Convert fragments back to `TimeBlock[]`
4. Merge and sort the result

#### `validateWeeklySchedule(weeklyPatterns)`

Validates an entire week by calling `validateTimeBlock` for each block against all other blocks on the same day. Returns `{ isValid, errors: [{ day, errors }] }`.

#### `checkTimeBlockOverlap(block1, block2)`

Low-level helper that checks if two time blocks overlap and returns detailed `TimeBlockOverlap` info.

---

## 7. Data‑Flow Walkthrough

### 7.1 Initial Load

```
1. MentorAvailabilityManager mounts
2. → GET /api/mentors/[mentorId]/availability
3. ← { schedule, weeklyPatterns, exceptions, rules }
4. If schedule is null → use DEFAULT_SCHEDULE
5. If schedule exists → merge weeklyPatterns into schedule state
6. Set originalSchedule for change detection
7. AvailabilityExceptions independently → GET /api/mentors/[mentorId]/availability/exceptions
```

### 7.2 Editing Weekly Schedule

```
1. User toggles a day or edits a time block in WeeklyScheduleEditor
2. → onPatternChange(dayOfWeek, { timeBlocks: [...] })
3. MentorAvailabilityManager updates schedule.weeklyPatterns
4. hasChanges = true (deep comparison fails)
5. Save/Reset buttons become visible
```

### 7.3 Saving

```
1. User clicks "Save Changes"
2. MentorAvailabilityManager → PUT /api/mentors/[mentorId]/availability
   Body: entire schedule object
3. Server validates (Zod + validateWeeklySchedule)
4. Server runs transaction:
   a. Upsert mentor_availability_schedules
   b. Delete all mentor_weekly_patterns for this schedule
   c. Insert new mentor_weekly_patterns
5. ← { success: true }
6. Client resets originalSchedule = current schedule
7. hasChanges = false
```

### 7.4 Creating an Exception

```
1. User clicks "Add Exception" or quick-add button
2. Selects dates on Calendar, sets type/reason
3. → POST /api/mentors/[mentorId]/availability/exceptions
   Body: { startDate, endDate, type, reason, isFullDay, timeBlocks? }
4. Server validates → checks for overlapping exceptions (409 if overlap)
5. ← { success: true, exception: {...} }
6. Client refetches exceptions list
```

### 7.5 Mentee Booking (Consuming Availability)

```
1. Booking UI → GET /api/mentors/[id]/availability/available-slots
                  ?startDate=...&endDate=...
2. Server computes slots:
   a. For each day in range, look up weekly pattern
   b. Filter via exceptions
   c. Fragment via applyBlockedTimes
   d. Generate slots at sessionDuration intervals
   e. Filter by booking window (min/max advance)
   f. Subtract existing bookings (with buffer)
3. ← { slots: [...], sessionDuration, timezone, disabledDays, total }
4. UI displays bookable slots to mentee
```

---

## 8. Dependencies

### NPM Packages

| Package | Usage |
|---|---|
| `next` | Framework (App Router) |
| `drizzle-orm` + `drizzle-orm/pg-core` | Database ORM |
| `zod` | API request validation |
| `date-fns` | Date manipulation (format, addDays, addMinutes, etc.) |
| `date-fns-tz` | Timezone conversion (toZonedTime, fromZonedTime) |
| `sonner` | Toast notifications |
| `lucide-react` | Icons |

### Shadcn/UI Components Used

- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`
- `Button`, `Badge`
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Switch`, `Label`, `Input`, `Textarea`
- `Alert`, `AlertDescription`
- `Separator`
- `Calendar` (multi-date selection mode)

---

## 9. Implementation Checklist

### Phase 1: Database

- [ ] Create the two PostgreSQL enums (`recurrence_pattern`, `availability_type`)
- [ ] Create `mentor_availability_schedules` table
- [ ] Create `mentor_weekly_patterns` table
- [ ] Create `mentor_availability_exceptions` table
- [ ] Create `availability_templates` table
- [ ] Create `mentor_availability_rules` table (optional — not heavily used)
- [ ] Define Drizzle relations and export types
- [ ] Add to `lib/db/schema/index.ts` exports
- [ ] Run `db:push` or `db:migrate`

### Phase 2: Validation Utility

- [ ] Create `lib/utils/availability-validation.ts`
- [ ] Implement `checkTimeBlockOverlap()`
- [ ] Implement `validateTimeBlock()`
- [ ] Implement `mergeAndSortTimeBlocks()`
- [ ] Implement `applyBlockedTimes()`
- [ ] Implement `validateWeeklySchedule()`

### Phase 3: API Routes

- [ ] Create `app/api/mentors/[id]/availability/route.ts` (GET, POST, PUT)
- [ ] Create `app/api/mentors/[id]/availability/exceptions/route.ts` (GET, POST, DELETE)
- [ ] Create `app/api/mentors/[id]/availability/available-slots/route.ts` (GET)
- [ ] Create `app/api/mentors/[id]/availability/slots/route.ts` (GET) — optional, for calendar view

### Phase 4: Frontend Components

- [ ] Create `MentorAvailabilityManager` (orchestrator with tabs)
- [ ] Create `WeeklyScheduleEditor` (day toggles, time blocks, dialogs)
- [ ] Create `AvailabilitySettings` (timezone, session config, booking prefs)
- [ ] Create `AvailabilityExceptions` (calendar, quick-add, list)
- [ ] Create `AvailabilityTemplates` (premade templates, save/load custom)
- [ ] Install required Shadcn/UI components (`npx shadcn@latest add calendar dialog tabs select switch ...`)

### Phase 5: Integration

- [ ] Add "Availability" menu item to mentor dashboard sidebar
- [ ] Wire the mentor ID into `MentorAvailabilityManager`
- [ ] Connect booking UI to available-slots API
- [ ] Test full flow: configure availability → book a session as mentee → verify slot disappears
