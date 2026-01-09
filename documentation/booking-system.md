# Booking System Documentation

> **Last Updated:** 2026-01-09  
> **Purpose:** Documents the mentor-mentee session booking flow

---

## Overview

The booking system allows a **mentee** to book a session with a **mentor** through a multi-step wizard process.

---

## Frontend Components

Located in `components/booking/`:

| Component | Purpose |
|-----------|---------|
| `booking-modal.tsx` | Main wizard container (4 steps: time-selection → details → confirmation → success) |
| `time-slot-selector-v2.tsx` | Step 1: Calendar & time slot selection |
| `booking-form.tsx` | Step 2: Duration, meeting type, session title/description |
| `booking-confirmation.tsx` | Step 3: Review summary, pricing, payment form |

### Wizard Flow
```
time-selection → details → confirmation → success
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mentors/[id]/availability/slots` | GET | Fetch available time slots |
| `/api/bookings` | POST | Create new booking |
| `/api/bookings` | GET | Get user's bookings |
| `/api/bookings/[id]` | GET | Get specific booking |
| `/api/bookings/[id]` | PUT | Update booking |
| `/api/bookings/[id]` | DELETE | Cancel booking |
| `/api/bookings/[id]/cancel` | POST | Cancel with reason |
| `/api/bookings/[id]/reschedule` | POST | Reschedule to new time |
| `/api/bookings/[id]/no-show` | POST | Mark as no-show |

---

## Database Schema

### `sessions` table (`lib/db/schema/sessions.ts`)

Core booking/session data:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `mentorId` | text | References users.id |
| `menteeId` | text | References users.id |
| `title` | text | Session topic |
| `description` | text | Additional details |
| `status` | text | `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show` |
| `scheduledAt` | timestamp | Scheduled start time |
| `startedAt` | timestamp | Actual start time |
| `endedAt` | timestamp | Actual end time |
| `duration` | integer | Duration in minutes |
| `meetingUrl` | text | LiveKit/video call URL |
| `meetingType` | text | `video`, `audio`, `chat` |
| `location` | text | For in-person meetings |
| `rate` | decimal | Session rate |
| `currency` | text | e.g., `USD` |
| `cancelledBy` | text | `mentor` or `mentee` |
| `cancellationReason` | text | Why cancelled |
| `rescheduledFrom` | UUID | References original session |
| `rescheduleCount` | integer | Times this session has been rescheduled |
| `recordingConfig` | jsonb | Recording settings |

### Session Policies (`lib/db/schema/session-policies.ts`)

Admin-configurable settings for cancellation/rescheduling:

| Policy Key | Default | Description |
|------------|---------|-------------|
| `cancellation_cutoff_hours` | 2 | Min hours before session to cancel |
| `reschedule_cutoff_hours` | 4 | Min hours before session to reschedule |
| `max_reschedules_per_session` | 2 | Max reschedules allowed |
| `free_cancellation_hours` | 24 | Hours for penalty-free cancel |
| `require_cancellation_reason` | true | Reason is mandatory |

### Session Audit Log (`lib/db/schema/session-audit-log.ts`)

Tracks all cancellations and reschedules:
- `sessionId`, `userId`, `action` (cancel/reschedule)
- `reasonCategory`, `reasonDetails`
- `previousScheduledAt`, `newScheduledAt`
- `policySnapshot`, `ipAddress`, `userAgent`

### Mentor Availability (`lib/db/schema/mentor-availability.ts`)

**`mentorAvailabilitySchedules`** - Global settings:
- `timezone`, `defaultSessionDuration`, `bufferTimeBetweenSessions`
- `minAdvanceBookingHours`, `maxAdvanceBookingDays`
- `defaultStartTime`, `defaultEndTime`
- `isActive`, `allowInstantBooking`, `requireConfirmation`

**`mentorWeeklyPatterns`** - Weekly recurring availability:
- `dayOfWeek` (0-6, Sunday-Saturday)
- `isEnabled` (boolean)
- `timeBlocks` (JSON array with startTime, endTime, type)

**`mentorAvailabilityExceptions`** - Holidays/vacations:
- `startDate`, `endDate`
- `type` (AVAILABLE, BREAK, BUFFER, BLOCKED)
- `reason`, `isFullDay`

---

## Booking Creation Flow

`POST /api/bookings` (`app/api/bookings/route.ts`):

1. **Auth & Rate Limit** - Verify logged in, max 3 bookings/minute
2. **Input Validation** - Zod schema + business rules
3. **Self-booking Check** - Cannot book yourself
4. **Mentor Verification** - Exists and `isAvailable`
5. **Availability Checks**:
   - Schedule active
   - Within advance booking window
   - Day enabled in weekly patterns
   - Time within AVAILABLE block
   - No blocking exceptions
   - No conflicts (including buffer)
6. **Create Session** - Insert into `sessions` table
7. **Notifications** - Notify both mentor and mentee
8. **LiveKit Room** - Creates video room for session

---

## Availability Slot Generation

`GET /api/mentors/[id]/availability/slots`:

1. Fetch schedule, weekly patterns, exceptions
2. Get existing bookings in date range
3. For each day in range:
   - Check if day enabled
   - Generate 30-min interval slots from AVAILABLE blocks
   - Filter: past, outside window, exceptions, conflicts
4. Convert to requested timezone
5. Return slots with availability status

---

## Business Rules

| Rule | Value |
|------|-------|
| Min booking duration | 15 minutes |
| Max booking duration | 4 hours |
| Slot interval | 30 minutes |
| Cancellation cutoff | 2 hours before session (configurable) |
| Reschedule cutoff | 4 hours before session (configurable) |
| Max reschedules | 2 per session (configurable) |
| Business hours | 9 AM - 9 PM (default) |
| Min advance booking | 30 minutes (configurable per mentor) |

### Mentee-Only Policy

> **Important:** Only mentees can cancel or reschedule sessions. Mentors cannot modify bookings.

**Cancellation Reason Categories (Required):**
- Schedule conflict
- Personal emergency
- No longer need this session
- Found alternative solution
- Technical issues expected
- Other (free text)

---

## Validation Schema

Located in `lib/validations/booking.ts`:

- `createBookingSchema` - For new bookings
- `updateBookingSchema` - For updates
- `cancelBookingSchema` - For cancellations
- `rescheduleBookingSchema` - For rescheduling

---

## Key Files

```
components/booking/
├── booking-modal.tsx          # Main wizard
├── booking-form.tsx           # Session details form
├── booking-confirmation.tsx   # Review & confirm
├── time-slot-selector-v2.tsx  # Date/time picker
├── cancel-dialog.tsx          # Cancel confirmation
├── reschedule-dialog.tsx      # Reschedule UI
└── session-actions.tsx        # Action buttons

app/api/bookings/
├── route.ts                   # POST (create), GET (list)
└── [id]/
    ├── route.ts               # GET, PUT, DELETE
    ├── cancel/route.ts        # POST cancel
    ├── reschedule/route.ts    # POST reschedule
    └── no-show/route.ts       # POST no-show

lib/db/schema/
├── sessions.ts                # Session table
├── mentor-availability.ts     # Availability tables
├── session-policies.ts        # Configurable policies
└── session-audit-log.ts       # Audit trail

lib/validations/
└── booking.ts                 # Zod schemas
```
