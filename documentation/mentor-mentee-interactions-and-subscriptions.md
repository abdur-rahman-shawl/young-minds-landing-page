# Mentor-Mentee Interactions & Subscription Context

## 1. Introduction
SharingMinds is a Next.js-based mentorship platform designed to connect Mentors and Mentees. The platform facilitates session scheduling, video conferencing, and resource sharing.

## 2. User Roles & Flows

### 2.1 Mentees
*   **Registration**: Users sign up via Google or Email. By default, new users are assigned the `mentee` role upon session creation (see `lib/auth.ts` database hooks).
*   **Dashboard**: Located at `/dashboard`. Provides access to discovery, sessions, and settings.
*   **Interactions**:
    *   **Search**: Browse mentors via `/api/mentors`.
    *   **Booking**: Book sessions (`/api/bookings`). Supports payment and scheduling.
    *   **Sessions**: Join video calls (LiveKit integration implied by dependencies) and leave reviews.
    *   **Messaging**: Communicate with mentors (API presence `api/messages`).

### 2.2 Mentors
*   **Onboarding**: Users apply via `/become-expert` or `/mentor-signup`.
*   **Verification**:
    *   Application submitted to `api/mentors/apply`.
    *   Status tracks: `YET_TO_APPLY` -> `IN_PROGRESS` -> `VERIFIED` (or `REJECTED`/`REVERIFICATION`).
    *   Admins manage this status.
*   **Dashboard**: Functionality exposed via `/api/mentor`:
    *   **Stats**: `dashboard-stats` endpoint.
    *   **Recent Activity**: `recent-sessions`, `recent-messages`.
*   **Controls**:
    *   Manage Availability (JSON based).
    *   Set Hourly Rate & Currency.
    *   View Upcoming Sessions.
    *   Access Session Recordings (`/api/recordings`).

### 2.3 Admins
*   **Access**: Route `/admins` (likely base for admin pages like `/admins/analytics`).
*   **Capabilities** (Exposed via `/api/admin`):
    *   **Mentor Management**:
        *   List all mentors (`api/admin/mentors`).
        *   Verify/Approve/Reject applications (`api/admin/mentors/[id]/verify`).
        *   Audit logs (`api/admin/mentors/[id]/audit`).
    *   **Mentee Management**: View mentee list (`api/admin/mentees`).
    *   **Enquiries**: Manage contact form submissions (`api/admin/enquiries`).
    *   **Analytics**: Admin-specific analytics (`api/analytics/admin`).
*   **Security**: Admin routes are protected via middleware checking session roles.

## 3. Database Schema
The database is PostgreSQL, managed via Drizzle ORM (`lib/db/schema`).

| Table | Description | Key Fields |
| :--- | :--- | :--- |
| **users** | Core identity | `id`, `email`, `googleId`, `image`, `is_active` |
| **roles** | RBAC definitions | `name` ('admin', 'mentor', 'mentee') |
| **user_roles** | User <-> Role Map | `userId`, `roleId`, `assigned_by` |
| **mentors** | Mentor specific profile | `verification_status`, `hourly_rate`, `availability`, `payment_status` |
| **mentees** | Mentee specific profile | `interests`, `learning_style`, `career_goals` |
| **sessions** | Meeting records | `status` (scheduled/completed), `meeting_url`, `rate`, `recording_config` |

## 4. API Architecture
API routes are structured in `app/api/` and secured with `better-auth`.
Authentication check is centralized in `middleware.ts` but specific role checks often reside in API handlers.

*   **/api/auth/**: Authentication endpoints.
*   **/api/admin/**: Admin actions (Mentor verification, user management).
*   **/api/mentors/**: Public listing, application submission.
*   **/api/bookings/** & **/api/sessions/**: Session lifecycle management.
*   **/api/livekit/**: Webhooks for real-time video/audio logic.

## 5. Subscription & Payments Context (For Future Discussion)
Currently, code handles "per-session" transaction logic (`hourly_rate`, `rate`).
*   **Existing Payment Logic**:
    *   `mentors` table has `hourly_rate`, `currency`, `payment_status`.
    *   `sessions` table captures `rate` at booking time to lock price.
    *   Coupon system exists (`is_coupon_code_enabled` in mentors).

*   **Gap Analysis for Subscriptions**:
    *   **No recurring billing model** in current schema.
    *   **No 'Plan' entity**: Need a way to define "Basic", "Pro" plans.
    *   **No 'UserSubscription' entity**: To track valid-until dates and plan status.
    *   **Logic Need**: A Booking/Session creation step needs to check "Does user have active subscription?" -> "Is this session covered by credits/unlimited?" -> Bypass payment if yes.
