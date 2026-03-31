# Findings

## Context

- Reviewed current working tree at `HEAD = 1c7097d` on 2026-03-30 UTC.
- This repo is not in a clean state. At the time of inspection, `git status --short | wc -l` returned `638`, so these notes describe the current tree, not a pristine baseline.
- Scale of repo inspected:
  - `551` source files across `app`, `components`, `lib`, `hooks`, `providers`, `contexts`, `types`, `scripts`
  - `126` API route handlers
  - `21` App Router pages
  - approximately `225,011` lines of code across the main source directories
- The latest pulled delta reviewed here is `fc504a0..1c7097d`, which is concentrated in mentor content, admin content review, public profile content, and soft-delete retention.

## Architecture Map

- Stack:
  - Next.js 15 / React 19 / TypeScript in `package.json`
  - Better Auth in `lib/auth.ts`
  - Drizzle ORM + Postgres across `lib/db/**`
  - TanStack Query in client state/query hooks
  - LiveKit for sessions/recordings
  - Google Gemini via AI SDK in `app/api/chat/route.ts`
- Root runtime shell:
  - `app/layout.tsx` wraps the app in error boundary, query provider, theme provider, auth provider, and toaster.
  - `contexts/auth-context.tsx` is the main client auth state source and depends on `app/api/auth/session-with-roles/route.ts`.
  - `middleware.ts` is intentionally lightweight. It only checks for auth cookies and defers role enforcement to handlers and components.
- Shell duplication:
  - `/` renders `app/page.tsx` -> `components/PageContent.tsx`
  - `/dashboard` renders `app/dashboard/page.tsx` -> `components/dashboard/dashboard-shell.tsx`
  - These two shells duplicate large parts of mentee, mentor, and admin dashboard routing logic.
- Core domains:
  - Session booking / cancellation / rescheduling / reassignment / reviews / refunds
  - Mentor availability schedules, templates, exceptions, slot generation
  - Messaging, requests, notifications, SSE
  - Mentor content, courses, enrollments, reviews
  - Subscription plans, plan features, usage tracking, enforcement
  - Mentor onboarding, admin verification, email, OTP, location data
  - LiveKit rooms, recordings, playback
  - AI chat and AI-gated mentor discovery

## Project-Wide Verified Findings

### High severity

- Build-time safety rails are weakened, and the app still does not build cleanly.
  - `next.config.mjs:2-8` sets `eslint.ignoreDuringBuilds = true` and `typescript.ignoreBuildErrors = true`.
  - Even with those disabled checks, `npm run build` still enters a normal production build path and has historically failed in this repo with webpack errors.

- The mentor availability API contains hard broken references to an undefined `session` variable.
  - `app/api/mentors/[id]/availability/route.ts:191-196`
  - `app/api/mentors/[id]/availability/route.ts:213-217`
  - `app/api/mentors/[id]/availability/exceptions/route.ts:138-142`
  - `app/api/mentors/[id]/availability/exceptions/route.ts:259-263`
  - These are not theoretical design concerns; they are direct code errors.

- Available-slot generation is using the wrong identifier domain for mentor bookings.
  - `app/api/mentors/[id]/availability/available-slots/route.ts:160`
  - `lib/db/schema/sessions.ts:7`
  - `sessions.mentorId` references `users.id`, but the slot route compares it to `mentor[0].id` from the `mentors` table.
  - Result: existing bookings can be missed, and slots can be offered when they should be blocked.

- The same slot route checks for a non-existent availability exception type.
  - `app/api/mentors/[id]/availability/available-slots/route.ts:190-195`
  - `app/api/mentors/[id]/availability/exceptions/route.ts:16`
  - The code checks for `UNAVAILABLE`, but the enum only allows `AVAILABLE`, `BREAK`, `BUFFER`, and `BLOCKED`.

- Admin-driven notifications are structurally broken.
  - Sender helpers:
    - `app/api/admin/mentors/route.ts:197-214`
    - `app/api/mentors/apply/route.ts:23-30`
  - Target API restrictions:
    - `app/api/notifications/route.ts:91-112`
  - The helper functions call `/api/notifications` server-side without forwarding auth, while the notification API requires an authenticated session and only allows creating notifications for `session.user.id`.
  - Consequence: admin-originated or cross-user notifications will 401/403 and silently fail unless separately caught.

- Admin mentor PATCH returns unresolved async formatting work.
  - `app/api/admin/mentors/route.ts:341-345`
  - `formatMentorRecord` is async, but `refreshedRows.map(formatMentorRecord)` is returned without `await Promise.all(...)`.

### Medium severity

- Review-needed session endpoints are under-filtered.
  - `app/api/sessions/needs-review/route.ts:31-40`
  - `app/api/sessions/needs-review-mentee/route.ts:32-41`
  - The `sessions.status === 'completed'` checks are commented out, so unreveiwed sessions can appear even if they were never completed.

- Saved mentors is still a mock feature.
  - `app/api/saved-mentors/route.ts:7-15`
  - `app/api/saved-mentors/route.ts:24-44`
  - `app/api/saved-mentors/route.ts:73-95`
  - There is no real persistence table or production path yet.

- Storage provider support is incomplete.
  - `lib/storage/providers/s3.ts:14-31`
  - The S3 provider still throws `not implemented yet` for upload/delete/signed URL operations.

- Recording is intentionally disabled in code.
  - `lib/livekit/recording-manager.ts:44`
  - This is a deliberate kill switch, not a bug, but the capability is currently off regardless of surrounding schema/services.

- Mentor payment gate UI is incomplete.
  - `components/mentor/dashboard/mentor-payment-gate.tsx:200-214`
  - “Proceed to payment” renders without a payment click handler.

- Branding and documentation drift is significant.
  - `app/layout.tsx:15-17` still uses `SharingMinds`
  - `lib/email.ts:40-59` still uses `SharingMinds`
  - `lib/otp.ts:55-69` still uses `SharingMinds`
  - `package.json:2` still uses `my-v0-project`
  - `README.md:1-45` is still the v0 starter template
  - `TESTING_GUIDE.md:1-260` is narrowly scoped to mentor availability rather than the platform as a whole

- Subscription/content entitlement contract is inconsistent in code.
  - `app/api/mentors/content/route.ts:148-166` uses raw `'create_post_content'`
  - `lib/subscriptions/feature-keys.ts:1-44` defines `content_posting_access`
  - This may still function if the database seeds the raw key, but the code contract is drifting.

## Pulled Delta Review: `fc504a0..1c7097d`

## What changed

- New admin content review APIs:
  - `app/api/admin/content/route.ts`
  - `app/api/admin/content/[id]/route.ts`
  - `app/api/admin/content/[id]/review/route.ts`
- New mentor content workflow APIs:
  - `app/api/mentors/content/[id]/submit-review/route.ts`
  - `app/api/mentors/profile-content/route.ts`
  - `app/api/mentors/[id]/public-content/route.ts`
- Expanded mentor content schema:
  - content review states
  - audit trail
  - flagging data
  - archive/restore metadata
  - soft-delete retention
  - mentor profile content selection
- New admin and mentor UI:
  - `components/admin/dashboard/admin-content.tsx`
  - `components/mentor/content/profile-content-selector.tsx`
  - `components/mentor/dashboard/mentor-profile-content.tsx`
- New purge tooling:
  - `scripts/purge-deleted-mentor-content.ts`
  - `package.json:11-19`

## New or newly surfaced findings in the pulled content system

### High severity

- Platform-owned content is excluded from the new admin content list and detail endpoints.
  - Creation path:
    - `app/api/mentors/content/route.ts:172-199`
    - Admin-created course content sets `mentorId: null`.
  - Admin list path:
    - `app/api/admin/content/route.ts:79-92`
  - Admin detail path:
    - `app/api/admin/content/[id]/route.ts:45-56`
  - Both admin endpoints use `innerJoin(mentors, ...)` and `innerJoin(users, ...)`, so content with `mentorId = null` disappears from the admin moderation surface.
  - This is a direct mismatch with the new platform-course capability introduced in the same pull.

- The new status model was not propagated to the public course and enrollment APIs.
  - New content statuses live in `lib/db/schema/mentor-content.ts:35-56` and now use `APPROVED` instead of `PUBLISHED`.
  - Public course listing still filters for `PUBLISHED`:
    - `app/api/courses/route.ts:79`
    - `app/api/courses/route.ts:170-174`
  - Course enrollment still requires `PUBLISHED`:
    - `app/api/courses/[id]/enroll/route.ts:79-107`
  - Consequence: newly approved mentor content/courses will not be discoverable or enrollable through the public course APIs.

- The live edit dialog still uses the obsolete content status contract.
  - It is still mounted from `components/mentor/content/content.tsx:17-20` and `components/mentor/content/content.tsx:383`.
  - Rejected content is explicitly editable in `components/mentor/content/content.tsx:75-77`.
  - But `components/mentor/content/edit-content-dialog.tsx:23-30` still validates `status` as `DRAFT | PUBLISHED | ARCHIVED`.
  - The select UI still exposes `PUBLISHED` rather than `PENDING_REVIEW | APPROVED | REJECTED` at `components/mentor/content/edit-content-dialog.tsx:258-299`.
  - Result: the pulled workflow says rejected content is editable, but the editor is still bound to the old status model.

### Medium severity

- `ProfileContentSelector` is writing state during render via `useMemo`.
  - `components/mentor/content/profile-content-selector.tsx:82-93`
  - `useMemo` is being used for side effects:
    - `setLocalSelectedIds(...)`
    - `setHasChanges(false)`
  - This is a React anti-pattern and can produce render-loop warnings or unstable state synchronization. This should be `useEffect`.

- Profile content replacement is not transactional.
  - `app/api/mentors/profile-content/route.ts:106-117`
  - The code deletes all current selections, then inserts the replacement set, but does not wrap the two operations in a transaction.
  - If the insert fails after delete, the mentor loses the profile selection set.

- The new public content feature appears only partially integrated.
  - Public API exists at `app/api/mentors/[id]/public-content/route.ts:8-96`.
  - UI reader exists at `components/mentor/dashboard/mentor-profile-content.tsx:1-150`.
  - It is mounted only inside `components/mentor/dashboard/mentor-profile.tsx:418`.
  - No references were found to `MentorProfile` from the active mentee-facing mentor detail flows during inspection.
  - That suggests the new public content surface may currently be dead or at least not wired into the actual mentor detail experience used by mentees.

- Content subscription enforcement is explicitly disabled for creation.
  - `app/api/mentors/content/route.ts:12-13`
  - `ENFORCE_CONTENT_SUBSCRIPTION = false`
  - This is clearly intentional, but it means the newly expanded content system is not currently enforcing paid-plan checks on creation.

### Low severity / operational notes

- The soft-delete retention model is backed by a dedicated purge script and migration.
  - Migration: `lib/db/migrations/0044_add_mentor_content_soft_delete_retention.sql`
  - Purge script: `scripts/purge-deleted-mentor-content.ts`
  - Script entry: `package.json:12`
  - This is a coherent pattern, but it introduces an operational requirement: the purge job must actually be scheduled or deleted content will accumulate indefinitely.

- Storage cleanup helpers are now centralized.
  - `lib/storage/index.ts:52-81`
  - Module/section/content-item deletes now clean up nested storage files in several content routes.
  - This is a positive change overall.

## Verification Performed

- Repo inventory:
  - counted source files, route handlers, pages, and total LOC
- Architecture read:
  - inspected app shell, auth/session hydration, middleware, key schemas, route guards, subscriptions, livekit, notifications, onboarding
- Pulled delta review:
  - reviewed the mentor-content schema, admin content review APIs, profile/public content APIs, hooks, and UI integration points
- Commands run:
  - `npm run lint`
  - `npm run build`

## Verification Notes

- `npm run lint` does not pass on the current tree.
  - Representative hard failures include:
    - `app/learn/[id]/page.tsx:193,286,307` assigning to `module`
    - `components/shared/dashboard/courses.tsx:163,194` conditional `useEffect` usage
    - many `react/no-unescaped-entities` violations across auth, booking, landing, mentor, and shared components
  - It also reports a long tail of hook dependency warnings and `no-img-element` warnings.
- `npm run build` still exits with:
  - `Build failed because of webpack errors`
  - No more specific module-level webpack diagnostic was emitted in this environment, including when re-run via `npx next build --debug`.

## Recommended Immediate Order

- Fix broken availability handlers (`session` references, slot filtering mismatch, invalid exception type).
- Fix admin mentor PATCH return handling and server-side notification delivery.
- Propagate the new content status model across all course/public/enrollment APIs.
- Fix the live content editor contract (`edit-content-dialog.tsx`) and the render-phase state update in `profile-content-selector.tsx`.
- Decide whether platform-owned content should exist, then align admin moderation queries to that model.
- Consolidate the duplicate dashboard shells and finish the mentor onboarding flow cleanup.
