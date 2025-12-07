## Coupon Code Flow Overview

The mentor onboarding coupon system lets admins waive the onboarding payment for specific mentors by issuing single-use coupon codes. Mentors can apply these codes to skip payment. This document summarizes every moving part of the feature.

---

### Data Model

- **Columns (`lib/db/schema/mentors.ts`)**
  - `coupon_code` (`text`): stores the last issued coupon for the mentor.
  - `is_coupon_code_enabled` (`boolean`, default `false`): indicates whether the coupon was generated for the mentor.
  - `payment_status` (`text`, default `PENDING`): tracks onboarding payment (`PENDING`, `COMPLETED`, `FAILED`). Coupon logic only touches mentors in `PENDING`.

---

### Admin Experience

#### Verification Page (`components/admin/dashboard/AdminMentors`)

- Pending tab:
  - Admin can toggle “Enable coupon code” before approving a mentor. On approval:
    - `enableCoupon` flag is sent with the PATCH request.
    - Server generates a coupon, sets `is_coupon_code_enabled = true`, stores the code, and emails it with the approval email.

- Verified tab:
  - Two filters narrow the list:
    - **Payment pending**: `payment_status === 'PENDING'`.
    - **Coupon code enabled**: `is_coupon_code_enabled === true`.
    - Filters combine with AND logic per checkbox.
  - For each verified mentor with `payment_status === 'PENDING'`:
    - A button appears:
      - Label: `Send coupon code` if `is_coupon_code_enabled` is false, otherwise `Re-send coupon code`.
      - Coloring differentiates states (indigo = first send, amber = re-send).
    - Clicking calls `/api/admin/mentors/coupon` to issue or reissue a code and trigger the email.

- Detail dialog mirrors the card actions, showing the same button/filters.

---

### Admin API Layer

#### `PATCH /api/admin/mentors`

- Validates admin session.
- Accepts `{ mentorId, status, notes?, enableCoupon? }`.
- When `status === 'VERIFIED'` and `enableCoupon === true`:
  - Generates a new code (6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
  - Sets `coupon_code` and `is_coupon_code_enabled = true`.
  - Sends the “mentor approved” email with the code.
- Always logs admin actions via `logAdminAction`.

#### `POST /api/admin/mentors/coupon`

- Validates admin session.
- Payload: `{ mentorId }`.
- Checks:
  - Mentor exists.
  - `verification_status === 'VERIFIED'`.
  - `payment_status === 'PENDING'`.
- Generates a coupon, sets `coupon_code`, `is_coupon_code_enabled = true`, updates timestamps.
- Sends approval email template with the new coupon (used for both initial send and re-send).
- Logs `MENTOR_COUPON_SENT`.

---

### Mentor Experience

#### Auth Session (`app/api/auth/session-with-roles/route.ts`)

When fetching session data, mentors receive the latest `couponCode`, `isCouponCodeEnabled`, and `paymentStatus`, making the dashboard aware of current status without extra requests.

#### Dashboard (`components/mentor/dashboard/mentor-only-dashboard.tsx`)

- Mentors with `payment_status === 'PENDING'` see the payment-required screen with coupon input.
- Applying a coupon hits `/api/mentor/payments/validate-coupon`:
  - Ensures the mentor is authenticated.
  - Confirms `payment_status !== 'COMPLETED'`.
  - Requires `coupon_code` to exist and match the provided code.
  - Requires `is_coupon_code_enabled === true`.
  - On success:
    - Sets `payment_status = 'COMPLETED'`.
    - Clears `coupon_code`.
    - Updates timestamps.

---

### Coupon Validation Endpoint (`/api/mentor/payments/validate-coupon`)

1. Auth check.
2. Body validation with Zod (non-empty code).
3. Fetch mentor record by `user_id`.
4. Validation order:
   - Mentor exists.
   - Payment not already completed.
   - Coupon exists.
   - Coupon is enabled.
   - Provided code (uppercased) matches stored code.
5. Update mentor to finalize payment and clear coupon state.
6. Response: `{ success: true, message }` or `{ success: false, error }`.

---

### Email + Notifications

- `sendMentorApplicationApprovedEmail(email, name, couponCode?)`
  - Shared by both approval and coupon re-send flows.
  - Renders a coupon section only when a code exists.
- Notification triggers mirror statuses:
  - Approved → `MENTOR_APPLICATION_APPROVED`.
  - Rejected → `MENTOR_APPLICATION_REJECTED`.
  - Reverification → `MENTOR_APPLICATION_UPDATE_REQUESTED`.
  - Coupon-specific endpoint doesn’t send notifications beyond the email to avoid spamming dashboards.

---

### Admin UI State Sync

- After every fetch/update, the React state seeds `couponToggles` from `is_coupon_code_enabled` to keep UI toggles aligned with the latest server data.
- Issuing a coupon re-fetches mentors to ensure the filters, button states, and line items remain accurate.

---

### Summary

1. Admin approves mentor:
   - Optional checkbox issues coupon immediately.
2. Verified mentors can receive coupons later through the “Send/Re-send coupon code” button if payment is still pending.
3. Mentor applies coupon via dashboard → payment marked complete, coupon fields cleared, button disappears.
4. Filters on the Verified tab help admins quickly find mentors awaiting payment or with active coupons.

This flow ensures coupons are tightly controlled, traceable, and easy for admins and mentors to manage.
