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
| `time-slot-selector-v2.tsx` | Step 1: Calendar & time slot selection (also used in reschedule) |
| `booking-form.tsx` | Step 2: Duration, meeting type, session title/description |
| `booking-confirmation.tsx` | Step 3: Review summary, pricing, payment form |
| `session-actions.tsx` | Action buttons (Join, Reschedule, Cancel, No-Show) |
| `cancel-dialog.tsx` | Cancel confirmation with reason selection |
| `reschedule-dialog.tsx` | Reschedule UI with mentor's availability slots |

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
| `/api/bookings` | GET | Get user's bookings (includes rescheduleCount) |
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

## Cancellation Flow (Mentee Only)

`POST /api/bookings/[id]/cancel` (`app/api/bookings/[id]/cancel/route.ts`):

1. **Auth Check** - Must be logged in
2. **Parse Body** - `reasonCategory` (required), `reasonDetails` (optional)
3. **Fetch Booking** - Verify exists
4. **Authorization** - Only mentee can cancel (`booking.menteeId === session.user.id`)
5. **Status Validation** - Can't cancel if `cancelled`, `completed`, `in_progress`
6. **Policy Check** - Load `cancellation_cutoff_hours` from DB (default 2)
7. **Time Check** - `hoursUntilSession >= cancellationCutoffHours`
8. **Update Session** - Set `status='cancelled'`, `cancelledBy='mentee'`, `cancellationReason`
9. **Audit Log** - Insert record with policy snapshot
10. **Notify Both** - Mentor gets "Session Cancelled", Mentee gets "Cancellation Confirmed"

### Cancellation Reason Categories (Required)
- Schedule conflict
- Personal emergency
- No longer need this session
- Found alternative solution
- Technical issues expected
- Other (free text)

---

## Reschedule Flow (Mentee Only)

`POST /api/bookings/[id]/reschedule` (`app/api/bookings/[id]/reschedule/route.ts`):

1. **Auth Check** - Must be logged in
2. **Parse Body** - `scheduledAt` (required), `duration` (optional)
3. **Fetch Booking** - Verify exists
4. **Authorization** - Only mentee can reschedule (`booking.menteeId === session.user.id`)
5. **Status Validation** - Can't reschedule if `cancelled`, `completed`, `no_show`, `in_progress`
6. **Load Policies**:
   - `reschedule_cutoff_hours` (default 4)
   - `max_reschedules_per_session` (default 2)
7. **Reschedule Count Check** - `booking.rescheduleCount < maxReschedules`
8. **Time Check** - `hoursUntilSession >= rescheduleCutoffHours`
9. **Update Session** - New `scheduledAt`, increment `rescheduleCount`
10. **Audit Log** - Insert with `previousScheduledAt`, `newScheduledAt`
11. **Notify Both** - Mentor gets "Session Rescheduled", Mentee gets "Reschedule Confirmed"

### Frontend Reschedule Dialog

The `reschedule-dialog.tsx` component:
- Uses `TimeSlotSelectorV2` to show only mentor's available time slots
- Fetches current `rescheduleCount` from session data via `GET /api/bookings/[id]`
- Shows reschedule allowance badge (e.g., "1 / 2 used")
- Disables rescheduling if limit reached
- Requires `mentorId` prop to fetch mentor's availability

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

- **Mentors** see an info message: "Only the mentee can cancel or reschedule this session"
- **Mentors** can mark sessions as no-show (within 24 hours of past session time)

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
├── time-slot-selector-v2.tsx  # Date/time picker (used in booking & reschedule)
├── cancel-dialog.tsx          # Cancel confirmation
├── reschedule-dialog.tsx      # Reschedule UI with availability slots
└── session-actions.tsx        # Action buttons (passes mentorId to reschedule)

app/api/bookings/
├── route.ts                   # POST (create), GET (list with rescheduleCount)
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

---

## Data Flow Diagrams

### Booking Creation
```
Mentee → booking-modal.tsx → POST /api/bookings
           ↓                         ↓
      time-slot-selector      Validate availability
      booking-form            Check conflicts
      booking-confirmation    Create session record
                              Create notifications
                              Create LiveKit room
```

### Cancel Flow (Mentee Only)
```
session-actions.tsx → CancelDialog → POST /api/bookings/[id]/cancel
       ↓                    ↓                     ↓
  canCancel check     Reason select      Verify mentee
  (>=2hrs, mentee)    Reason details     Load policy from DB
                                         Check cutoff time
                                         Update session.status
                                         Insert audit log
                                         Create notifications
```

### Reschedule Flow (Mentee Only)
```
session-actions.tsx → RescheduleDialog → POST /api/bookings/[id]/reschedule
       ↓                      ↓                       ↓
  canReschedule check   TimeSlotSelectorV2    Verify mentee
  (>=4hrs, mentee)      (mentor's slots)      Load policies
  Pass mentorId         Show count badge      Check max limit
                                              Check cutoff time
                                              Update scheduledAt
                                              Increment count
                                              Insert audit log
                                              Create notifications
```
