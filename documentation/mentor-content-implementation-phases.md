# Mentor Content Module - Implementation Phases

> Update: the current runtime no longer uses the internal `/api/mentors/content/**`, `/api/mentors/profile-content`, or `/api/admin/content/**` handlers for app-internal calls. Those flows now run through `lib/content/server/service.ts` + `lib/trpc/routers/content.ts`. The historical phase notes below still describe the workflow changes that were first introduced in those handlers.

## Phase 1 (Completed on 2026-03-17)

### Goal
Ship immediate workflow safety fixes without schema migration risk.

### Implemented

1. Workflow hardening on mentor content create/update/delete:
- `POST /api/mentors/content` ignores client-side status and creates as `DRAFT`.
- `PUT /api/mentors/content/[id]` now enforces safe transition rules.
- `DELETE /api/mentors/content/[id]` is now soft-delete behavior (archive), not hard delete.

2. Review/audit consistency:
- `POST /api/mentors/content/[id]/submit-review` wrapped in transaction.
- `POST /api/admin/content/[id]/review` wrapped in transaction.
- Canonical audit-action mapping added (prevents action name drift).

3. Admin force-delete safety:
- `FORCE_DELETE` now archives content and marks it restore-restricted (no immediate physical delete).
- Reason required for `FORCE_DELETE`.

4. UI alignment:
- Mentor delete copy changed to archive semantics.
- Admin action label/flow changed to soft-delete messaging with reason capture.
- Create content dialog now draft-first only; stale publish option removed.

### Files touched in Phase 1
- `app/api/mentors/content/route.ts`
- `app/api/mentors/content/[id]/route.ts`
- `app/api/mentors/content/[id]/submit-review/route.ts`
- `app/api/admin/content/[id]/review/route.ts`
- `components/mentor/content/content.tsx`
- `components/admin/dashboard/admin-content.tsx`
- `components/mentor/content/create-content-dialog.tsx`
- `hooks/queries/use-content-queries.ts`

---

## Phase 2 (Completed on 2026-03-17)

### Goal
Add retention-aware soft delete metadata and basic purge/cleanup lifecycle support.

### Implemented

1. Soft-delete retention fields added:
- Schema updated with `deletedAt`, `deletedBy`, `deleteReason`, `purgeAfterAt`.
- SQL migration added: `lib/db/migrations/0044_add_mentor_content_soft_delete_retention.sql`.

2. Delayed purge worker added:
- New script: `scripts/purge-deleted-mentor-content.ts`.
- New npm command: `npm run content:purge-deleted`.
- Purge selects soft-deleted content whose `purgeAfterAt <= now`, deletes related storage objects, then hard-deletes DB rows.

3. API retention metadata wiring:
- Mentor delete now writes deletion metadata and 30-day purge schedule.
- Admin `FORCE_DELETE` now writes deletion metadata and 30-day purge schedule.
- Mentor content list now hides soft-deleted rows from mentors.

4. Storage cleanup hooks implemented:
- Root content file replacement cleanup (`/api/mentors/content/[id]`).
- Course thumbnail replacement cleanup (`/api/mentors/content/[id]/course`).
- Section content item file replacement/delete cleanup.
- Module and section hard deletes now clean up nested content-item files.

---

## Phase 3 (Planned)

1. Normalize auth/ownership checks across all mentor content routes.
2. Add admin full-detail review experience.
3. Add aggregate admin metrics endpoint (global counts, not page-scope counts).
4. Expand nested-entity lifecycle audit coverage.
5. Add job scheduling + operational runbook for `content:purge-deleted`.
