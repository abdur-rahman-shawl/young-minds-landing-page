# Admin Messaging

## Purpose

Admin users can now initiate direct inbox conversations with any mentor or mentee without going through the normal message-request approval flow.

This is built on the existing messaging foundation:

- `message_threads`
- `messages`
- `messaging_permissions`
- `notifications`

It does not introduce a separate chat system.

## Product Rules

- Mentee to mentor messaging remains request-gated.
- Mentors still do not initiate first contact with mentees.
- Admins can initiate first contact with mentors and mentees directly.
- Recipients do not see an admin conversation until the admin sends the first message.
- The conversation shows the actual admin account identity, using that admin user’s name.
- This is extendable to multiple admins later because the thread is tied to the real admin user account, not a shared fake platform sender.

## Entry Points

- Admin mentee directory: `components/admin/dashboard/admin-mentees.tsx`
- Admin mentor directory and mentor detail dialog: `components/admin/dashboard/admin-mentors.tsx`
- Shared compose dialog: `components/admin/dashboard/admin-direct-message-dialog.tsx`
- Admin inbox tab: `components/admin/sidebars/admin-sidebar.tsx`
- Admin dashboard section routing: `components/dashboard/dashboard-experience.tsx`

## Backend Flow

Admin thread creation is handled by the shared messaging domain:

- `lib/messaging/server/service.ts`
- `lib/trpc/routers/messaging.ts`

On first send, the service flow:

1. Requires an authenticated admin session.
2. Validates the recipient exists and has either the `mentor` or `mentee` role.
3. Creates or re-activates bidirectional `messaging_permissions`.
4. Creates or reuses a `message_thread`.
5. Reopens archived/deleted visibility before re-entry.
6. Inserts the first `messages` record immediately.
7. Creates the recipient notification through the shared send-message flow with a deep link into the inbox.

## Policy Model

Normal mentor/mentee messaging remains request-backed and subscription-enforced through the shared messaging service.

Direct admin conversations are the only valid non-request-backed messaging path. That policy lives in:

- `lib/messaging/policy.ts`

Rules:

- Request-backed conversations use the existing subscription messaging actions.
- Direct conversations without `grantedViaRequestId` are only allowed when one participant has the `admin` role.
- Any other direct conversation fails loudly.
- The admin compose dialog now uses the tRPC `messaging.startAdminConversation` mutation instead of a separate REST creator route.

## Deep Links

Messaging deep links are centralized in:

- `lib/messaging/urls.ts`

Current URLs:

- Thread: `/dashboard?section=messages&thread=<threadId>`
- Requests tab: `/dashboard?section=messages&tab=requests`

The shared inbox reads these query params in:

- `components/messaging/messaging-hub.tsx`

## Verification

Unit coverage for the policy layer and messaging URL helpers lives in:

- `tests/lib/messaging/policy.test.ts`

Run with:

```bash
npm test -- tests/lib/messaging/policy.test.ts
```

Additional DOM-oriented component tests can opt into `jsdom` with the standard `@vitest-environment jsdom` file directive when you start adding UI coverage.
