# Booking System Documentation

> **Last Updated:** 2026-02-01
> **Purpose:** Documents the mentor-mentee session booking flow

---

## Overview

The booking system allows a **mentee** to book a session with a **mentor** through a multi-step wizard process. It also includes comprehensive tools for managing sessions, cancellations, and rescheduling for both parties.

---

## Frontend Components

Located in `components/booking/`:

| Component | Purpose |
|-----------|---------|
| `booking-modal.tsx` | Main wizard container (4 steps: time-selection → details → confirmation → success) |
| `time-slot-selector-v2.tsx` | Step 1: Calendar & time slot selection (also used in reschedule) |
| `booking-form.tsx` | Step 2: Duration, meeting type, session title/description |
| `booking-confirmation.tsx` | Step 3: Review summary, pricing, payment form |
| `sessions-calendar-view.tsx` | **Mentee's** session calendar with popup details, inline actions |
| `mentor-schedule-view.tsx` | **New: Mentor's** dedicated schedule view (Week/List toggle, stats, popup) |
| `session-actions.tsx` | Action buttons (Join, Reschedule, Cancel, No-Show) |
| `cancel-dialog.tsx` | Cancel confirmation with reason selection |
| `reschedule-dialog.tsx` | Reschedule UI with mentor's availability slots |
| `reschedule-response-dialog.tsx` | **New:** UI for responding to reschedule requests (Accept/Counter/Reject) |
| `reschedule-request-banner.tsx` | Shows pending reschedule status or respond button |

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
| `/api/bookings` | GET | Get user's bookings (includes rescheduleCount, mentee info for mentors) |
| `/api/bookings/[id]` | GET | Get specific booking |
| `/api/bookings/[id]` | PUT | Update booking |
| `/api/bookings/[id]` | DELETE | Cancel booking |
| `/api/bookings/[id]/cancel` | POST | Cancel with reason |
| `/api/bookings/[id]/reschedule` | POST | Request reschedule (creates pending request) |
| `/api/bookings/[id]/reschedule/respond` | POST | Respond to reschedule (accept/reject/counter) |
| `/api/bookings/[id]/reschedule/withdraw` | POST | Withdraw own reschedule request |
| `/api/bookings/[id]/no-show` | POST | Mark as no-show |
| `/api/mentor/mentees-sessions` | GET | **New:** Get unique mentees & session stats for mentor view |
| `/api/session-policies` | GET | Fetch session policies (optional `?role=mentor\|mentee`) |

### Session Policies API

`GET /api/session-policies` (`app/api/session-policies/route.ts`):

Fetches configurable session policies from the database. Used by frontend dialogs to display dynamic policy values.

**Query Parameters:**
- `role` (optional): `mentor` or `mentee` - Returns role-specific policies

**Response (with role):**
```json
{
  "cancellationCutoffHours": 1,
  "rescheduleCutoffHours": 2,
  "maxReschedules": 5,
  "freeCancellationHours": 24,
  "rescheduleRequestExpiryHours": 48,
  "maxCounterProposals": 3
}
```

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
| `rescheduleCount` | integer | Times mentee rescheduled |
| `mentorRescheduleCount` | integer | Times mentor rescheduled |
| `recordingConfig` | jsonb | Recording settings |
| **Refund Tracking** | | |
| `refundAmount` | decimal | Amount to refund |
| `refundPercentage` | integer | Percentage of rate |
| `refundStatus` | text | `none`, `pending`, `processed`, `failed` |
| **Pending Reschedule** | | |
| `pendingRescheduleRequestId` | UUID | FK to reschedule_requests |
| `pendingRescheduleTime` | timestamp | Proposed new time |
| `pendingRescheduleBy` | text | `mentor` or `mentee` |

### Session Policies (`lib/db/schema/session-policies.ts`)

Admin-configurable settings for cancellation/rescheduling:

| Policy Key | Default | Description |
|------------|---------|-------------|
| `cancellation_cutoff_hours` | 2 | Min hours before session to cancel |
| `reschedule_cutoff_hours` | 4 | Min hours before session to reschedule (mentee) |
| `mentor_reschedule_cutoff_hours` | 2 | Min hours before session to reschedule (mentor) |
| `max_reschedules_per_session` | 2 | Max reschedules allowed (mentee) |
| `mentor_max_reschedules_per_session` | 2 | Max reschedules allowed (mentor) |
| `free_cancellation_hours` | 24 | Hours for penalty-free cancel |
| `require_cancellation_reason` | true | Reason is mandatory |
| `reschedule_request_expiry_hours` | 48 | Hours until reschedule request expires |
| `max_counter_proposals` | 3 | Max counter-proposals per reschedule |

### Reschedule Requests (`lib/db/schema/reschedule-requests.ts`)

Tracks reschedule negotiation between mentor and mentee:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `sessionId` | UUID | FK to sessions |
| `initiatedBy` | text | `mentor` or `mentee` |
| `initiatorId` | text | FK to users |
| `status` | text | `pending`, `accepted`, `rejected`, `counter_proposed`, `cancelled`, `expired` |
| `proposedTime` | timestamp | Requested new time |
| `proposedDuration` | integer | Duration in minutes |
| `originalTime` | timestamp | Original scheduled time |
| `counterProposedTime` | timestamp | Counter-proposal time |
| `counterProposedBy` | text | Who made counter-proposal |
| `counterProposalCount` | integer | Rounds of negotiation |
| `expiresAt` | timestamp | Auto-expiry time |

### Session Audit Log (`lib/db/schema/session-audit-log.ts`)

Tracks all cancellations and reschedules:
- `sessionId`, `userId`, `action` (cancel/reschedule/reschedule_accepted)
- `reasonCategory`, `reasonDetails`
- `previousScheduledAt`, `newScheduledAt`
- `policySnapshot`, `ipAddress`, `userAgent`

---

## Mentor Schedule View (New)

The `MentorScheduleView` component (`components/booking/mentor-schedule-view.tsx`) provides a comprehensive dashboard for mentors to manage their sessions.

**Features:**
1.  **Stats Overview:** Header cards showing Total Mentees, Total Sessions (All Time), Upcoming Sessions, and Completed Sessions.
2.  **View Toggle:** Switch between a **Weekly Calendar** (visual grid) and a **List View** (chronological list).
3.  **Detailed Session Popup:** Clicking a session opens a dialog with:
    *   **Mentee Info:** Avatar, Name (fetched via `users` table join), and session context.
    *   **Session Details:** Time, date, countdown, meeting type.
    *   **Inline Actions:** Join, Reschedule, Cancel, Add Notes.
    *   **Reschedule Management:** If a request is pending, displays "Accept", "Counter", and "Decline" buttons directly in the popup.

---

## Reschedule Flow (Approval Required)

The reschedule system ensures that any time change is mutually agreed upon.

### Flow Diagram

```
User (Mentor/Mentee) clicks "Reschedule"
        ↓
Creates reschedule_request (status: 'pending')
        ↓
Updates session: pendingRescheduleTime, pendingRescheduleBy
        ↓
Notifies other party (Action URL points to schedule/sessions view)
        ↓
Other party responds via RescheduleResponseDialog:
  ├─ Accept → Session updated to new time, request 'accepted'
  ├─ Counter-propose → New time suggested, request 'counter_proposed' (Logic handles this state)
  ├─ Reject → Request 'rejected', session stays at original time
  └─ Cancel (mentee only) → Session cancelled, 100% refund
```

### API: Request Reschedule

`POST /api/bookings/[id]/reschedule`:

1.  **Auth Check** - Must be logged in
2.  **Authorization** - Must be mentor OR mentee
3.  **Check for existing pending request**
4.  **Policy check** - Check cutoff hours and max reschedules
5.  **Create reschedule_request** - Status: 'pending', set expiry
6.  **Update session** - Set pending reschedule fields
7.  **Notify other party** - "Respond Now" action link dynamically routes to the correct dashboard section

### API: Respond to Reschedule

`POST /api/bookings/[id]/reschedule/respond`:

**Body:**
```json
{
  "requestId": "uuid",
  "action": "accept" | "reject" | "counter_propose" | "cancel_session",
  "counterProposedTime": "2024-01-26T10:00:00Z", // Required if action is counter_propose
  "cancellationReason": "..."
}
```

**Actions:**
-   **`accept`**: Updates session `scheduledAt` to `proposedTime` (or `counterProposedTime` if status was 'counter_proposed'). Increments reschedule count. Mark request 'accepted'.
-   **`reject`**: Keeps original time. Mark request 'rejected'. (Mentor only).
-   **`counter_propose`**: Suggests a different time. Updates request status to `counter_proposed`, increments `counterProposalCount`. Max 3 rounds.
-   **`cancel_session`**: Mentee cancels the session in response to a mentor's reschedule request. 100% refund triggered.

---

## Cancellation Flow (Mentor AND Mentee)

`POST /api/bookings/[id]/cancel` (`app/api/bookings/[id]/cancel/route.ts`):

1.  **Auth Check** - Must be logged in
2.  **Authorization** - Must be mentor OR mentee of this session
3.  **Status Validation** - Can't cancel if already `cancelled`, `completed`, `in_progress`
4.  **Policy Check** - Load role-specific cutoff and refund policies
5.  **Time Check** - `hoursUntilSession >= cancellationCutoffHours` (mentee only)
6.  **Calculate Refund** - Based on timing and who cancels (Mentor cancels = 100% refund)
7.  **Update Session** - Set status, cancelledBy, refundPercentage, etc.
8.  **Audit Log** - Insert record
9.  **Notify Other Party**

---

## Availability Slot Generation

`GET /api/mentors/[id]/availability/slots`:

1.  Fetch schedule, weekly patterns, exceptions
2.  Get existing bookings in date range
3.  For each day in range:
    -   Check if day enabled
    -   Generate 30-min interval slots from AVAILABLE blocks
    -   Filter: past, outside window, exceptions, conflicts
4.  Convert to requested timezone
5.  Return slots with availability status

---
