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
| `mentor-schedule-view.tsx` | **Mentor's** dedicated schedule view (Week/List toggle, stats, popup) |
| `session-actions.tsx` | Action buttons (Join, Reschedule, Cancel, No-Show) |
| `cancel-dialog.tsx` | Cancel confirmation with reason selection |
| `reschedule-dialog.tsx` | Reschedule UI with mentor's availability slots |
| `reschedule-response-dialog.tsx` | UI for responding to reschedule requests (Accept/Counter/Reject) |
| `reschedule-request-banner.tsx` | Shows pending reschedule status or respond button |
| `reassignment-response-banner.tsx` | Mentee accept/browse/reject UI for auto-reassigned sessions |
| `no-mentor-found-banner.tsx` | **New:** Mentee browse/cancel UI when no auto-replacement found |

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

When a **mentor** cancels a session, the system automatically tries to assign a replacement mentor. The mentee can then accept, browse other mentors, or cancel.

#### Flow Diagram

```
Mentor clicks "Cancel" → Selects reason → Confirms
        ↓
System calls findAvailableReplacementMentor()
        ↓
    ┌───────────────────────────────────────┐
    │ Replacement mentor found?             │
    └───────────────────────────────────────┘
        │                      │
       YES                     NO
        ↓                      ↓
Session reassigned         Set status = 'awaiting_mentee_choice'
to new mentor              Store cancelled mentor IDs
        ↓                      ↓
Set wasReassigned = true   Notify mentee: "Browse other mentors"
Set status = 'pending_acceptance'    ↓
        ↓                  Mentee sees NoMentorFoundBanner
Notify mentee: "Your mentor changed"   │
        ↓                      ├── Browse Mentors → Select new mentor + time
Mentee sees ReassignmentResponseBanner │
        │                      └── Cancel (Full Refund)
    ┌───┼───────┐
    │   │       │
Accept  Browse  Cancel
    ↓   ↓       ↓
Continue with   Go to    100% refund
new mentor     /sessions/[id]/select-mentor
```

#### Database Fields (sessions table)

| Column | Type | Description |
|--------|------|-------------|
| `wasReassigned` | boolean | True if session was auto-reassigned |
| `reassignedFromMentorId` | text | Original mentor's user ID |
| `reassignedAt` | timestamp | When reassignment occurred |
| `reassignmentStatus` | text | `pending_acceptance`, `accepted`, `rejected`, `awaiting_mentee_choice` |
| `cancelledMentorIds` | jsonb | Array of mentor IDs who cancelled this session (excluded from browse) |

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bookings/[id]/accept-reassignment` | POST | Mentee confirms auto-assigned mentor |
| `/api/bookings/[id]/reject-reassignment` | POST | Mentee rejects → 100% refund |
| `/api/bookings/[id]/alternative-mentors` | GET | Fetch available mentors for browsing |
| `/api/bookings/[id]/select-alternative-mentor` | POST | Mentee selects different mentor |

#### Browse Alternative Mentors Flow

**Scenario A: Auto-assigned mentor exists**
- Mentee sees: Accept | Browse Other Mentors | Cancel
- Browse shows mentors available at **same date/time only**
- No payment required (uses existing session payment)

**Scenario B: No mentor found**
- Mentee sees: Browse Mentors | Cancel  
- Browse shows all available mentors with **date/time selector**
- Mentee picks mentor + available slot
- No payment required (uses existing session payment)

**Excluded mentors:** All mentors in `cancelledMentorIds` are excluded from results.

#### Mentor Matching Service

`lib/services/mentor-matching.ts` → `findAvailableReplacementMentor()`

**Checks performed:**
1. Mentor is active, verified, and has active schedule
2. Mentor's weekly pattern allows the day/time
3. No blocking exceptions for the date
4. No conflicting bookings (with buffer time)

**Returns:** Mentor user ID or `null` if no suitable mentor found

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

**Blocking UI:** When a session is pending acceptance, all action buttons (Join Session, Reschedule, Cancel) are **hidden**. The mentee must accept or reject the reassignment before any other action is available.

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

## Email Notifications

> **Source:** `lib/email.ts`  
> **Sender:** `info.sharingminds@gmail.com` via nodemailer

### Booking-Related Emails

| Email | Recipient | Trigger | Template Function |
|-------|-----------|---------|-------------------|
| **Booking Confirmed** | Mentee | After successful booking | `sendBookingConfirmedEmail` |
| **New Booking Alert** | Mentor | After mentee books | `sendNewBookingAlertEmail` |
| **Mentor Cancelled (Reassigned)** | Mentee | Mentor cancels + new mentor auto-assigned | `sendMentorCancelledReassignedEmail` |
| **Mentor Cancelled (No Mentor)** | Mentee | Mentor cancels + no replacement found | `sendMentorCancelledNoMentorEmail` |
| **Mentee Cancelled** | Mentor | Mentee cancels session | `sendMenteeCancelledEmail` |
| **Mentee Cancellation Confirmation** | Mentee | Mentee cancels (confirmation) | `sendMenteeCancellationConfirmationEmail` |
| **Mentor Cancellation Confirmation** | Mentor | Mentor cancels (confirmation) | `sendMentorCancellationConfirmationEmail` |
| **New Mentor Assigned** | New Mentor | Auto-assigned or mentee-selected | `sendNewMentorAssignedEmail` |
| **Alternative Mentor Selected** | Mentee | Mentee selects new mentor | `sendAlternativeMentorSelectedEmail` |
| **Reschedule Request** | Other party | Reschedule request submitted | `sendRescheduleRequestEmail` |
| **Reschedule Confirmed** | Both parties | Reschedule accepted | `sendRescheduleConfirmedEmail` |

### Email Content Pattern

Each booking email includes:
- Personalized greeting
- Session details box (title, date, time, duration)
- Context-specific message
- CTA button linking to dashboard
- SharingMinds branding

### Future Emails (Not Yet Implemented)

| Email | Reason |
|-------|--------|
| Session Reminders (24h, 1h) | Requires background job/cron |
| Session Completed | Future feature |
| Refund Processed | Future feature |
| Booking Confirmed | Already handled by payment flow |
| New Booking Alert (to Mentor) | Already handled by payment flow |

### Audit Logging

All emails are logged via `recordEmailEvent()` with:
- Action type (e.g., `email.booking.mentee_cancelled`)
- Recipient email
- Template name
- Session ID and related details

---

## Admin Sessions Management

> **Status:** Planned  
> **Purpose:** Provides administrators with full visibility and control over all platform sessions.

This section documents the Admin Sessions Dashboard, a dedicated admin interface for viewing, managing, and intervening in mentor-mentee sessions.

---

### Admin Sessions Dashboard Overview

The admin sessions dashboard provides:
- **Full visibility** into all platform sessions
- **Intervention capabilities** for stuck or disputed sessions
- **Analytics** to identify patterns and issues
- **Audit trail** for accountability

#### Dashboard Sidebar Navigation

Add to `components/admin/sidebars/admin-sidebar.tsx`:
```typescript
{ key: "sessions", title: "Sessions", icon: CalendarClock }
```

---

### Dashboard KPI Cards

| KPI | Description | Calculation |
|-----|-------------|-------------|
| **Total Sessions** | All-time session count | `COUNT(*)` from sessions |
| **Completed Sessions** | Successfully completed | `WHERE status = 'completed'` |
| **Cancelled Sessions** | All cancellations | `WHERE status = 'cancelled'` |
| **No-Show Rate** | Percentage of no-shows | `no_show / total * 100` |
| **Avg Session Rating** | Average review rating | From reviews table |
| **Active Sessions Today** | Sessions scheduled today | `WHERE DATE(scheduledAt) = today` |
| **Total Revenue** | Sum of completed session rates | `SUM(rate) WHERE status = 'completed'` |
| **Refunds Issued** | Total refund amount | `SUM(refundAmount) WHERE refundStatus = 'processed'` |

---

### Sessions List View

#### Filterable Table Columns

| Column | Type | Sortable | Description |
|--------|------|----------|-------------|
| Session ID | UUID | ✅ | Unique identifier (truncated) |
| Title | text | ✅ | Session topic |
| Mentor | user | ✅ | Name + avatar |
| Mentee | user | ✅ | Name + avatar |
| Scheduled At | timestamp | ✅ | Date and time |
| Duration | integer | ✅ | Minutes |
| Status | badge | ✅ | Colored status badge |
| Meeting Type | text | ❌ | video/audio/chat |
| Rate | decimal | ✅ | Session price |
| Refund Status | badge | ✅ | none/pending/processed |
| Reschedule Count | integer | ✅ | Total reschedules |
| Created At | timestamp | ✅ | When booked |
| Actions | buttons | ❌ | View, Cancel, etc. |

#### Filter Options

| Filter | Type | Options |
|--------|------|---------|
| Status | multi-select | scheduled, in_progress, completed, cancelled, no_show |
| Date Range | date picker | Start date, End date |
| Mentor | autocomplete | Search by mentor name |
| Mentee | autocomplete | Search by mentee name |
| Meeting Type | select | video, audio, chat |
| Refund Status | select | none, pending, processed, failed |
| Reassigned | toggle | Show only reassigned sessions |
| Has Pending Reschedule | toggle | Sessions with pending requests |

#### Bulk Actions

| Action | Description |
|--------|-------------|
| **Export to CSV** | Download filtered sessions as CSV |
| **Bulk Cancel** | Cancel multiple sessions (requires confirmation) |

---

### Admin Actions on Sessions

#### Action: View Full Details

**Purpose:** View complete session information including recordings and notes.

**Access Level:** Read-only, no audit log entry required.

**Details Panel Shows:**
- Session metadata (ID, title, description)
- Mentor profile card
- Mentee profile card
- Full timeline (created → scheduled → started → ended)
- Reschedule history
- Cancellation details (if applicable)
- Refund information
- Recording links (if enabled)
- Related notifications sent
- Admin notes (internal)

---

#### Action: Force Cancel

**Purpose:** Admin cancels a session on behalf of either party.

**API Endpoint:** `POST /api/admin/sessions/[id]/cancel`

**Request Body:**
```typescript
{
  reason: string;              // Required: Reason for cancellation
  refundPercentage: number;    // 0-100, default: 100
  notifyParties: boolean;      // Default: true
}
```

**Logic:**
1. Validate admin role via `ensureAdmin()`
2. Check session exists and is not already cancelled/completed
3. Update session status to `cancelled`
4. Set `cancelledBy: 'admin'`
5. Calculate and apply refund
6. Log to `admin_session_audit_trail`
7. Send email notifications (if `notifyParties: true`)

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_FORCE_CANCEL',
  previousStatus: 'scheduled',
  newStatus: 'cancelled',
  reason: 'Reported by mentee - mentor unresponsive',
  details: {
    refundPercentage: 100,
    refundAmount: 50.00,
    notificationsSent: true,
  }
}
```

---

#### Action: Force Complete

**Purpose:** Mark a stuck session as completed (e.g., when system failed to auto-complete).

**API Endpoint:** `POST /api/admin/sessions/[id]/complete`

**Request Body:**
```typescript
{
  reason: string;              // Required: Why forcing completion
  actualDuration?: number;     // Override duration in minutes
}
```

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_FORCE_COMPLETE',
  previousStatus: 'in_progress',
  newStatus: 'completed',
  reason: 'Session stuck in progress after meeting ended',
  details: {
    actualDuration: 45,
    originalDuration: 60,
  }
}
```

---

#### Action: Issue Manual Refund

**Purpose:** Process refund outside normal cancellation flow.

**API Endpoint:** `POST /api/admin/sessions/[id]/refund`

**Request Body:**
```typescript
{
  amount: number;              // Refund amount
  reason: string;              // Required: Justification
  refundType: 'full' | 'partial' | 'bonus';  // Type of refund
}
```

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_MANUAL_REFUND',
  reason: 'Mentee reported poor session quality',
  details: {
    refundAmount: 25.00,
    refundType: 'partial',
    originalRate: 50.00,
  }
}
```

---

#### Action: Reassign Session

**Purpose:** Manually assign a different mentor to a session.

**API Endpoint:** `POST /api/admin/sessions/[id]/reassign`

**Request Body:**
```typescript
{
  newMentorId: string;         // New mentor's user ID
  reason: string;              // Required: Reason for reassignment
  notifyParties: boolean;      // Default: true
}
```

**Logic:**
1. Validate new mentor exists and is verified
2. Check new mentor is available at scheduled time
3. Update session `mentorId` to new mentor
4. Set `wasReassigned: true`, `reassignedFromMentorId`
5. Set `reassignmentStatus: 'accepted'` (admin override)
6. Log action
7. Notify all parties

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_REASSIGN_SESSION',
  reason: 'Original mentor account suspended',
  details: {
    previousMentorId: 'user_abc',
    newMentorId: 'user_xyz',
    previousMentorName: 'John Doe',
    newMentorName: 'Jane Smith',
  }
}
```

---

#### Action: Clear No-Show Flag

**Purpose:** Remove incorrect no-show status from a session.

**API Endpoint:** `POST /api/admin/sessions/[id]/clear-no-show`

**Request Body:**
```typescript
{
  reason: string;              // Required: Why clearing the flag
  restoreStatus: 'completed' | 'cancelled';  // What to restore to
}
```

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_CLEAR_NO_SHOW',
  previousStatus: 'no_show',
  newStatus: 'completed',
  reason: 'Mentee provided proof of attendance - system error',
}
```

---

#### Action: Override Policy

**Purpose:** Bypass session policies (reschedule limits, cancellation windows).

**API Endpoint:** `POST /api/admin/sessions/[id]/override-policy`

**Request Body:**
```typescript
{
  overrideType: 'allow_reschedule' | 'allow_cancellation' | 'extend_time';
  reason: string;              // Required
  expiresAt?: timestamp;       // When override expires
}
```

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_POLICY_OVERRIDE',
  reason: 'Mentee had medical emergency, allowing extra reschedule',
  details: {
    overrideType: 'allow_reschedule',
    previousRescheduleCount: 2,
    maxReschedules: 2,
    expiresAt: '2026-02-10T00:00:00Z',
  }
}
```

---

#### Action: Add Admin Note

**Purpose:** Add internal note to session (not visible to users).

**API Endpoint:** `POST /api/admin/sessions/[id]/notes`

**Request Body:**
```typescript
{
  note: string;                // The internal note
}
```

**Audit Log Entry:**
```typescript
{
  action: 'ADMIN_NOTE_ADDED',
  details: {
    notePreview: 'User complained about...' // First 100 chars
  }
}
```

---

### Database Schema Additions

#### Admin Session Audit Trail

**File:** `lib/db/schema/admin-session-audit-trail.ts`

```typescript
import { pgTable, text, timestamp, uuid, jsonb, decimal, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

export const adminSessionAuditTrail = pgTable('admin_session_audit_trail', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  
  // Action details
  action: text('action').notNull(),
  // Actions: ADMIN_FORCE_CANCEL, ADMIN_FORCE_COMPLETE, ADMIN_MANUAL_REFUND,
  //          ADMIN_REASSIGN_SESSION, ADMIN_CLEAR_NO_SHOW, ADMIN_POLICY_OVERRIDE,
  //          ADMIN_NOTE_ADDED, ADMIN_DISPUTE_RESOLVED
  
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  reason: text('reason'),
  details: jsonb('details'),
  
  // Metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminSessionAuditTrailRelations = relations(adminSessionAuditTrail, ({ one }) => ({
  admin: one(users, {
    fields: [adminSessionAuditTrail.adminId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [adminSessionAuditTrail.sessionId],
    references: [sessions.id],
  }),
}));

export type AdminSessionAudit = typeof adminSessionAuditTrail.$inferSelect;
export type NewAdminSessionAudit = typeof adminSessionAuditTrail.$inferInsert;
```

---

#### Admin Session Notes

**File:** `lib/db/schema/admin-session-notes.ts`

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

export const adminSessionNotes = pgTable('admin_session_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminSessionNotesRelations = relations(adminSessionNotes, ({ one }) => ({
  admin: one(users, {
    fields: [adminSessionNotes.adminId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [adminSessionNotes.sessionId],
    references: [sessions.id],
  }),
}));

export type AdminSessionNote = typeof adminSessionNotes.$inferSelect;
export type NewAdminSessionNote = typeof adminSessionNotes.$inferInsert;
```

---

#### Session Disputes (Optional)

**File:** `lib/db/schema/session-disputes.ts`

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { sessions } from './sessions';

export const sessionDisputes = pgTable('session_disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  
  // Reporter
  reportedBy: text('reported_by').references(() => users.id, { onDelete: 'set null' }),
  reporterRole: text('reporter_role'), // 'mentor' | 'mentee'
  
  // Dispute details
  reason: text('reason').notNull(),
  category: text('category'), // 'no_show', 'quality', 'behavior', 'technical', 'refund', 'other'
  description: text('description'),
  evidence: jsonb('evidence'), // Array of file URLs or references
  
  // Resolution
  status: text('status').notNull().default('open'),
  // Status: 'open', 'in_progress', 'resolved', 'dismissed'
  
  priority: text('priority').default('medium'), // 'low', 'medium', 'high', 'urgent'
  assignedTo: text('assigned_to').references(() => users.id), // Admin handling
  
  resolutionNotes: text('resolution_notes'),
  resolutionAction: text('resolution_action'),
  // Actions: 'refund_issued', 'warning_sent', 'account_suspended', 'no_action', 'session_rescheduled'
  
  resolvedBy: text('resolved_by').references(() => users.id),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

export const sessionDisputesRelations = relations(sessionDisputes, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionDisputes.sessionId],
    references: [sessions.id],
  }),
  reporter: one(users, {
    fields: [sessionDisputes.reportedBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [sessionDisputes.assignedTo],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [sessionDisputes.resolvedBy],
    references: [users.id],
  }),
}));

export type SessionDispute = typeof sessionDisputes.$inferSelect;
export type NewSessionDispute = typeof sessionDisputes.$inferInsert;
```

---

### API Endpoints

#### GET /api/admin/sessions

**File:** `app/api/admin/sessions/route.ts`

**Purpose:** Fetch all sessions with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `status` | string | Comma-separated statuses |
| `mentorId` | string | Filter by mentor |
| `menteeId` | string | Filter by mentee |
| `startDate` | ISO date | Filter from date |
| `endDate` | ISO date | Filter to date |
| `meetingType` | string | video, audio, chat |
| `refundStatus` | string | none, pending, processed, failed |
| `hasReschedule` | boolean | Has pending reschedule request |
| `wasReassigned` | boolean | Was auto-reassigned |
| `search` | string | Search term (title, mentor name, mentee name) |
| `sortBy` | string | Column to sort by |
| `sortOrder` | string | asc or desc |

**Response:**
```typescript
{
  success: true,
  data: {
    sessions: Session[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
    }
  }
}
```

---

#### GET /api/admin/sessions/stats

**File:** `app/api/admin/sessions/stats/route.ts`

**Purpose:** Fetch dashboard statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Stats from date |
| `endDate` | ISO date | Stats to date |

**Response:**
```typescript
{
  success: true,
  data: {
    totalSessions: number,
    completedSessions: number,
    cancelledSessions: number,
    noShowCount: number,
    noShowRate: number,           // percentage
    avgSessionRating: number,
    totalRevenue: number,
    refundsIssued: number,
    netRevenue: number,
    sessionsToday: number,
    pendingReschedules: number,
    
    // Breakdown by role
    cancellationsByMentor: number,
    cancellationsByMentee: number,
    
    // Trends (for charts)
    sessionsOverTime: Array<{ date: string, count: number }>,
    statusBreakdown: Array<{ status: string, count: number }>,
  }
}
```

---

#### GET /api/admin/sessions/[id]

**File:** `app/api/admin/sessions/[id]/route.ts`

**Purpose:** Fetch complete session details.

**Response:**
```typescript
{
  success: true,
  data: {
    session: Session & {
      mentor: User,
      mentee: User,
      rescheduleRequests: RescheduleRequest[],
      auditLog: SessionAuditLog[],
      adminNotes: AdminSessionNote[],
      adminActions: AdminSessionAudit[],
      dispute: SessionDispute | null,
    }
  }
}
```

---

#### POST /api/admin/sessions/[id]/cancel

**File:** `app/api/admin/sessions/[id]/cancel/route.ts`

See [Action: Force Cancel](#action-force-cancel) for details.

---

#### POST /api/admin/sessions/[id]/complete

**File:** `app/api/admin/sessions/[id]/complete/route.ts`

See [Action: Force Complete](#action-force-complete) for details.

---

#### POST /api/admin/sessions/[id]/refund

**File:** `app/api/admin/sessions/[id]/refund/route.ts`

See [Action: Issue Manual Refund](#action-issue-manual-refund) for details.

---

#### POST /api/admin/sessions/[id]/reassign

**File:** `app/api/admin/sessions/[id]/reassign/route.ts`

See [Action: Reassign Session](#action-reassign-session) for details.

---

#### POST /api/admin/sessions/[id]/clear-no-show

**File:** `app/api/admin/sessions/[id]/clear-no-show/route.ts`

See [Action: Clear No-Show Flag](#action-clear-no-show-flag) for details.

---

#### POST /api/admin/sessions/[id]/override-policy

**File:** `app/api/admin/sessions/[id]/override-policy/route.ts`

See [Action: Override Policy](#action-override-policy) for details.

---

#### GET/POST /api/admin/sessions/[id]/notes

**File:** `app/api/admin/sessions/[id]/notes/route.ts`

**GET Response:**
```typescript
{
  success: true,
  data: AdminSessionNote[]
}
```

**POST Body:**
```typescript
{
  note: string
}
```

---

#### GET /api/admin/sessions/export

**File:** `app/api/admin/sessions/export/route.ts`

**Purpose:** Export sessions as CSV.

**Query Parameters:** Same as `/api/admin/sessions` (filters apply to export).

**Response:** CSV file download.

---

### Frontend Components

#### Admin Sessions Dashboard

**File:** `components/admin/dashboard/admin-sessions.tsx`

**Features:**
- KPI cards row (stats overview)
- Filter bar with date range, status, search
- Sessions table with sorting
- Pagination controls
- Bulk action toolbar
- Session detail side panel

---

#### Session Detail Panel

**File:** `components/admin/dashboard/session-detail-panel.tsx`

**Features:**
- Session header (title, status badge, ID)
- Mentor/Mentee cards with links to profiles
- Timeline view (created → scheduled → started → ended)
- Reschedule history accordion
- Admin actions dropdown:
  - Force Cancel
  - Force Complete
  - Issue Refund
  - Reassign
  - Clear No-Show
  - Override Policy
- Admin notes section (add/view)
- Audit log accordion

---

#### Session Action Dialogs

**Files:**
- `components/admin/dashboard/sessions/force-cancel-dialog.tsx`
- `components/admin/dashboard/sessions/force-complete-dialog.tsx`
- `components/admin/dashboard/sessions/manual-refund-dialog.tsx`
- `components/admin/dashboard/sessions/reassign-dialog.tsx`
- `components/admin/dashboard/sessions/clear-no-show-dialog.tsx`
- `components/admin/dashboard/sessions/override-policy-dialog.tsx`

Each dialog includes:
- Confirmation message
- Required reason textarea
- Action-specific inputs
- Submit/Cancel buttons
- Loading state

---

### Email Notifications for Admin Actions

#### Admin Cancelled Session Email

**Recipient:** Mentor AND Mentee

**Trigger:** Admin force-cancels a session

**Template Function:** `sendAdminCancelledSessionEmail(recipientEmail, recipientName, sessionDetails, reason, refundInfo)`

**Content:**
- Subject: "Your session has been cancelled by support"
- Body: Session details, cancellation reason, refund information, contact support link

---

#### Admin Refund Issued Email

**Recipient:** Mentee

**Trigger:** Admin issues manual refund

**Template Function:** `sendAdminRefundIssuedEmail(email, name, sessionDetails, refundAmount, reason)`

**Content:**
- Subject: "Refund issued for your session"
- Body: Session details, refund amount, reason, processing time

---

#### Admin Session Reassigned Email

**Recipient:** Mentee AND New Mentor

**Trigger:** Admin reassigns session to different mentor

**Template Functions:**
- `sendAdminReassignedToMenteeEmail(email, name, sessionDetails, newMentorInfo, reason)`
- `sendAdminAssignedToMentorEmail(email, name, sessionDetails, menteeInfo)`

---

### Cancellation & Reschedule Analytics

#### Analytics Queries

**Top Cancellation Reasons:**
```sql
SELECT 
  cancellationReason,
  COUNT(*) as count,
  cancelledBy
FROM sessions
WHERE status = 'cancelled'
GROUP BY cancellationReason, cancelledBy
ORDER BY count DESC
LIMIT 10;
```

**Cancellation Rate by Role:**
```sql
SELECT 
  cancelledBy,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM sessions WHERE status = 'cancelled'), 2) as percentage
FROM sessions
WHERE status = 'cancelled'
GROUP BY cancelledBy;
```

**Reschedule Patterns:**
```sql
SELECT 
  initiatedBy,
  AVG(counterProposalCount) as avgNegotiations,
  COUNT(*) as totalRequests,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as acceptedCount
FROM reschedule_requests
GROUP BY initiatedBy;
```

**Repeat No-Show Offenders:**
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(*) as noShowCount,
  CASE 
    WHEN s.menteeId = u.id THEN 'mentee'
    ELSE 'mentor'
  END as role
FROM sessions s
JOIN users u ON (s.menteeId = u.id OR s.mentorId = u.id)
WHERE s.status = 'no_show'
GROUP BY u.id, u.name, u.email, role
HAVING COUNT(*) > 1
ORDER BY noShowCount DESC;
```

---

### File Structure Reference

```
young-minds-landing-page/
├── app/
│   └── api/
│       └── admin/
│           └── sessions/
│               ├── route.ts                    # GET all sessions
│               ├── stats/
│               │   └── route.ts                # GET dashboard stats
│               ├── export/
│               │   └── route.ts                # GET CSV export
│               └── [id]/
│                   ├── route.ts                # GET session details
│                   ├── cancel/
│                   │   └── route.ts            # POST force cancel
│                   ├── complete/
│                   │   └── route.ts            # POST force complete
│                   ├── refund/
│                   │   └── route.ts            # POST manual refund
│                   ├── reassign/
│                   │   └── route.ts            # POST reassign
│                   ├── clear-no-show/
│                   │   └── route.ts            # POST clear no-show
│                   ├── override-policy/
│                   │   └── route.ts            # POST policy override
│                   └── notes/
│                       └── route.ts            # GET/POST admin notes
│
├── components/
│   └── admin/
│       └── dashboard/
│           ├── admin-sessions.tsx              # Main sessions dashboard
│           ├── session-detail-panel.tsx        # Session detail side panel
│           └── sessions/
│               ├── sessions-table.tsx          # Sessions data table
│               ├── sessions-filters.tsx        # Filter controls
│               ├── sessions-stats-cards.tsx    # KPI cards
│               ├── force-cancel-dialog.tsx
│               ├── force-complete-dialog.tsx
│               ├── manual-refund-dialog.tsx
│               ├── reassign-dialog.tsx
│               ├── clear-no-show-dialog.tsx
│               └── override-policy-dialog.tsx
│
├── lib/
│   └── db/
│       └── schema/
│           ├── admin-session-audit-trail.ts    # Admin action audit
│           ├── admin-session-notes.ts          # Internal notes
│           └── session-disputes.ts             # Dispute tracking
```

---

### Future Enhancements

- [ ] Real-time session status updates (WebSocket)
- [ ] Automated no-show detection and flagging
- [ ] Session quality scoring based on reviews
- [ ] Mentor/Mentee reliability scores integration
- [ ] Automated dispute escalation rules
- [ ] Slack/Discord notifications for high-priority disputes
- [ ] Session recording access controls
- [ ] Two-admin approval for refunds above threshold

---
