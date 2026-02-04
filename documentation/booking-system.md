# Booking System Documentation

> **Last Updated:** 2026-02-04
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
| `reassignment-response-banner.tsx` | **New:** Mentee accept/reject UI for auto-reassigned sessions |

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
| `/api/bookings/[id]/accept-reassignment` | POST | Mentee accepts auto-assigned mentor |
| `/api/bookings/[id]/reject-reassignment` | POST | Mentee rejects → full refund |
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

### Cancellation Flow (Mentor AND Mentee)

`POST /api/bookings/[id]/cancel` (`app/api/bookings/[id]/cancel/route.ts`):

1. **Auth Check** - Must be logged in
2. **Authorization** - Must be mentor OR mentee
3. **Status Check** - Cannot cancel completed/cancelled sessions
4. **Roles-specific behavior**:
   - **Mentee:** Standard cancellation with refund calculation.
   - **Mentor:** See Auto-Reassignment Flow below.

5. **Update Session** - Set status/refund info
6. **Audit Log** - Record action
7. **Notify** - Send alerts

---

### Auto-Reassignment Flow (When Mentor Cancels)

When a **mentor** cancels a session, the system automatically tries to assign a replacement mentor. The mentee can then accept or reject this reassignment.

#### Flow Diagram

```
Mentor clicks "Cancel" → Selects reason → Confirms
        ↓
System calls findRandomAvailableMentor()
        ↓
    ┌───────────────────────────────────────┐
    │ Replacement mentor found?             │
    └───────────────────────────────────────┘
        │                      │
       YES                     NO
        ↓                      ↓
Session reassigned to      Session cancelled
new mentor                 100% refund to mentee
        ↓
Set wasReassigned = true
Set reassignmentStatus = 'pending_acceptance'
        ↓
Notify mentee: "Your mentor changed"
        ↓
Mentee sees ReassignmentResponseBanner
        │
    ┌───┴───┐
    │       │
Accept   Reject
    ↓       ↓
Continue  Cancel session
with new  100% refund
mentor
```

#### Database Fields (sessions table)

| Column | Type | Description |
|--------|------|-------------|
| `wasReassigned` | boolean | True if session was auto-reassigned |
| `reassignedFromMentorId` | text | Original mentor's user ID |
| `reassignedAt` | timestamp | When reassignment occurred |
| `reassignmentStatus` | text | `pending_acceptance`, `accepted`, `rejected` |

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bookings/[id]/accept-reassignment` | POST | Mentee confirms new mentor |
| `/api/bookings/[id]/reject-reassignment` | POST | Mentee rejects → 100% refund |

#### Accept Reassignment API

`POST /api/bookings/[id]/accept-reassignment`:

1. **Auth Check** - Must be mentee
2. **Validation** - Session must have `wasReassigned = true` and `reassignmentStatus = 'pending_acceptance'`
3. **Update** - Set `reassignmentStatus = 'accepted'`
4. **Notify** - New mentor receives confirmation
5. **Audit Log** - Record `reassignment_accepted`

#### Reject Reassignment API

`POST /api/bookings/[id]/reject-reassignment`:

**Request Body:**
```json
{
  "reason": "optional text"
}
```

**Logic:**
1. **Auth Check** - Must be mentee
2. **Validation** - Session must have `wasReassigned = true` and `reassignmentStatus = 'pending_acceptance'`
3. **Cancel Session** - Status = 'cancelled', 100% refund
4. **Update** - Set `reassignmentStatus = 'rejected'`
5. **Notify** - New mentor, original mentor, mentee all notified
6. **Audit Log** - Record `reassignment_rejected` with full context

#### Frontend Component

`ReassignmentResponseBanner` (`components/booking/reassignment-response-banner.tsx`):

Shown in `SessionsCalendarView` when `reassignmentStatus === 'pending_acceptance'`:
- Displays new mentor name and avatar
- **"Continue with [Mentor]"** button → calls accept-reassignment
- **"Cancel (Full Refund)"** button → opens confirmation dialog → calls reject-reassignment

#### Notification Types

| Type | Recipient | Trigger |
|------|-----------|---------|
| `SESSION_REASSIGNED` | Mentee | Mentor cancelled, new mentor assigned |
| `REASSIGNMENT_ACCEPTED` | New Mentor | Mentee confirmed session |
| `REASSIGNMENT_REJECTED` | New Mentor, Original Mentor | Mentee rejected, session cancelled |

---

### Refund Rules

| Scenario | Refund |
|----------|--------|
| Mentor cancels (no replacement) | 100% |
| Mentor cancels (mentee rejects reassignment) | 100% |
| Mentee cancels ≥24h before | 100% |
| Mentee cancels 2-24h before | 70% (configurable) |
| Mentee cancels <2h before | 0% (configurable) |

---

## Toast Notifications & User Feedback

All booking actions provide immediate visual confirmation via toast notifications. Toasts are displayed using shadcn/ui's `Toaster` component (mounted in `app/layout.tsx`).

### Cancellation Toasts

| Scenario | Title | Description |
|----------|-------|-------------|
| Mentor cancels → Reassigned | ✅ Session Reassigned Successfully | "Your session has been reassigned to another mentor. The mentee will be notified and can choose to continue or cancel for a full refund." |
| Mentor cancels → No replacement | ✅ Session Cancelled | "The session has been cancelled. The mentee has been notified and will receive a full refund of $X." |
| Mentee cancels | ✅ Session Cancelled | "The session has been cancelled successfully. Your mentor has been notified. [Refund details]" |

### Reschedule Toasts

| Action | Title | Description |
|--------|-------|-------------|
| Request sent | 📅 Reschedule Request Sent | "Your request to reschedule to [date/time] has been sent to the [mentor/mentee] for approval." |
| Accept | ✅ Session Rescheduled | "Session confirmed for [date/time]. Both parties have been notified." |
| Counter-propose | 📅 Counter-Proposal Sent | "Your alternative time of [date/time] has been sent for approval." |
| Cancel (during reschedule) | ✅ Session Cancelled | "The session has been cancelled. You will receive a full refund." |

### Reassignment Response Toasts

| Action | Title | Description |
|--------|-------|-------------|
| Accept new mentor | ✅ Session Confirmed | "You've confirmed the session with [new mentor]." |
| Reject reassignment | ✅ Session Cancelled | "Session cancelled. A full refund will be processed." |

### Toast Configuration

- **Duration**: 5-6 seconds for important messages
- **Location**: Top-right corner (default shadcn/ui positioning)
- **Variants**: Default (success), Destructive (errors)

---

## Cancel Dialog Role-Specific UI

The cancel dialog (`components/booking/cancel-dialog.tsx`) displays different content based on user role:

### Mentor View

**"What Happens Next" Box (blue):**
- We'll try to find another mentor for this session
- If found, the mentee can accept or cancel for a full refund
- If no replacement is found, the mentee receives a 100% refund
- No payment will be issued to you for this session

**Cancellation Policy:**
- The mentee will receive a full refund if no replacement is found
- Frequent cancellations may affect your mentor rating
- The mentee will be notified

### Mentee View

**"Refund Preview" Box (green):**
- Session Rate: $X.XX
- Your Refund: X% ($X.XX)

**Cancellation Policy:**
- Free cancellation: 24+ hours before session (100% refund)
- Partial refund: 2-24 hours before (70%)
- The mentor will be notified

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
