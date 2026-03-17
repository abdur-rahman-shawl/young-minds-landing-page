# Mentor Content Module - Architecture Notes and Improvement Backlog

> Date: 2026-03-17
> Purpose: Working notes for future implementation changes.
> Scope: Mentor content module internals, DB/API/admin controls, and improvement opportunities.
> Last updated after implementation: 2026-03-17 (Phase 2)

---

## 1) How the Mentor Content Module Works Today

### 1.1 Core Data Model (Drizzle + PostgreSQL)

Primary schema file: `lib/db/schema/mentor-content.ts`

Main tables involved:
- `mentor_content`: root content entity (`COURSE | FILE | URL`) and review state.
- `courses`: one-to-one extension for `mentor_content.type = COURSE`.
- `course_modules`: modules inside a course.
- `course_sections`: sections inside a module.
- `section_content_items`: lesson/content items inside a section.
- `content_review_audit`: review action log entries.
- `mentor_profile_content`: selected approved content shown on public mentor profile.

Important workflow enums:
- `content_status`: `DRAFT | PENDING_REVIEW | APPROVED | REJECTED | ARCHIVED | FLAGGED`
- `content_review_action`: `SUBMITTED | APPROVED | REJECTED | RESUBMITTED | ARCHIVED | RESTORED | FLAGGED | UNFLAGGED | FORCE_APPROVED | FORCE_ARCHIVED | APPROVAL_REVOKED | FORCE_DELETED`

Cascade behavior:
- Deleting `mentor_content` cascades to course tree + audit + profile selections.

### 1.2 API Surface

Mentor APIs:
- `/api/mentors/content` (list/create root content)
- `/api/mentors/content/[id]` (get/update/delete root content)
- `/api/mentors/content/[id]/submit-review` (mentor submits/resubmits)
- Course tree CRUD endpoints under `/api/mentors/content/.../course/...`
- Upload endpoints:
  - `/api/upload`
  - `/api/mentors/content/upload`
- Profile selection:
  - `/api/mentors/profile-content`
  - Public read endpoint: `/api/mentors/[id]/public-content`

Admin APIs:
- `/api/admin/content` (paginated list, filters)
- `/api/admin/content/[id]` (detail + audit history)
- `/api/admin/content/[id]/review` (approve/reject/flag/unflag/force actions)

### 1.3 Current Admin Controls

Admin UI file: `components/admin/dashboard/admin-content.tsx`

Admin can currently:
- Review pending content (`APPROVE`, `REJECT`)
- Force actions from dropdown (`FORCE_APPROVE`, `FORCE_ARCHIVE`, `REVOKE_APPROVAL`, `FLAG`, `UNFLAG`, `FORCE_DELETE`)
- Filter by status/type, search, and paginate list

Known current limitation in admin UI:
- "View Full Content" is placeholder only (toast), not actual review detail panel.

---

## 2) Confirmed Gaps / Risks (Pre-Phase 1 Baseline)

### 2.1 Deletion and Retention

1. Hard delete everywhere, no retention window
- Mentor delete: `DELETE /api/mentors/content/[id]` physically deletes row.
- Admin `FORCE_DELETE`: physical delete in `POST /api/admin/content/[id]/review`.
- Course module/section/item deletes are also hard deletes.

2. Storage cleanup is not coupled to deletes
- DB rows are deleted, but uploaded file objects in storage are not explicitly deleted in these handlers.
- This risks orphaned objects and potential compliance/data lifecycle issues.

3. No soft-delete recovery workflow
- No recycle bin, no restore-after-delete, no delayed purge strategy.

### 2.2 State Control / Workflow Integrity

4. Mentor content status can be directly set via update API
- `PUT /api/mentors/content/[id]` accepts `status` including `APPROVED/REJECTED`.
- This allows bypassing intended submit-review/admin-review flow by direct API call.

5. Create content API accepts workflow states from client
- `POST /api/mentors/content` accepts `status` beyond `DRAFT`.
- Should default server-side and disallow client-driven privileged states.

6. Audit log not guaranteed for all state changes
- Only submit-review and admin-review route insert into `content_review_audit`.
- Mentor archive/restore currently uses plain update path with no audit insert.

7. Non-transactional state updates + audit insert
- In admin review route, status update and audit insert are separate operations.
- Partial failure risk (state changed but no audit row).

### 2.3 Admin Control Consistency

8. Admin action names are inconsistent with audit enum naming
- Route accepts actions like `APPROVE`, `FORCE_APPROVE`.
- DB enum is `APPROVED`, `FORCE_APPROVED` etc.
- Current code writes request action directly as audit action (`action as any`) which is mismatch-prone.

9. `FORCE_DELETE` path returns early with no audit entry
- Delete occurs before audit insert and exits response.
- Removes forensic trace for highest-risk admin action.

10. Mixed authorization patterns
- Some routes use ownership helper correctly with admin bypass.
- Some deeper routes still require `mentors.userId = session.user.id` directly, reducing consistency and making behavior harder to reason about.

### 2.4 Upload Pipeline and Validation

11. Two upload endpoints with different constraints
- `/api/upload` enforces 100MB.
- `/api/mentors/content/upload` allows up to 500MB for some types.
- Frontend components are inconsistent about which endpoint they call.

12. UI file-size messaging does not fully align with backend limits
- Example: item creation UI advertises larger limits than `/api/upload` actually permits.

13. File-type validation is extension/MIME driven only
- No content-sniff verification step.

### 2.5 Other Practical Gaps

14. Admin stats on dashboard are page-scope in `ALL` tab
- Current cards compute counts from the currently loaded page data, not global aggregates.

15. No transaction for profile-content replace flow
- `PUT /api/mentors/profile-content` does delete-all then insert-all without explicit transaction.

16. Stale status option in create dialog
- UI includes `PUBLISHED` option while workflow now uses review states.

---

## 3) Recommended Improvements (Prioritized Backlog)

### P0 - Workflow and Data Safety

1. Enforce server-side status transition policy
- Disallow direct client setting of privileged states in create/update APIs.
- Introduce centralized transition guard for mentor vs admin transitions.

2. Implement soft delete with retention
- Add columns such as:
  - `deleted_at`, `deleted_by`, `delete_reason`, `purge_after_at`
- Replace hard delete endpoints with soft delete.
- Keep admin "force delete" as privileged purge action only.

3. Add delayed hard-purge job
- Scheduled purge after retention window (for example 30 days).
- Purge DB and associated storage objects in one controlled job.

4. Wrap state changes + audit writes in DB transactions
- Required for submit/review/archive/restore/delete flows.

5. Ensure audit events exist for every lifecycle change
- Include archive, restore, soft-delete, hard-delete attempts, and force actions.

### P1 - Admin Control Hardening

6. Normalize action vocabulary
- Map API request verbs to canonical audit enum values.
- Avoid `as any` writes for action fields.

7. Add two-step admin destructive controls
- Require reason + confirmation for force delete.
- Optionally require elevated admin role for irreversible actions.

8. Implement actual admin detail/review panel
- Replace placeholder with full payload + audit trail + linked file/course preview.

### P1 - Upload and File Lifecycle

9. Consolidate to one upload API contract
- One endpoint + one policy source for size/type limits.
- Keep frontend and backend limits in sync.

10. Add storage lifecycle hooks
- On file replacement: delete old file after successful replacement.
- On content soft-delete/purge: mark/purge associated storage assets.

### P2 - Consistency and Maintainability

11. Unify auth/ownership checks across all routes
- Use one helper pattern for mentor/admin authorization.

12. Add aggregate admin metrics endpoint
- Separate stats endpoint for true global counts by state.

13. Transactional profile-content updates
- Wrap delete+insert in a transaction.

14. Cleanup stale UI status options and docs
- Remove `PUBLISHED` remnants and keep status vocabulary aligned.

---

## 4) Suggested Implementation Sequence

1. State-transition guard + API contract cleanup (P0)
2. Soft delete schema + endpoint refactor (P0)
3. Audit + transaction enforcement (P0)
4. Storage cleanup and purge worker (P1)
5. Admin review UX completion + metrics (P1)
6. Authorization and endpoint consolidation cleanup (P2)

---

## 5) Notes for Future PRs

- Keep migrations backward-safe; do not hard-switch old data paths in one deploy.
- Roll out soft-delete first, purge worker second.
- Add focused regression checklist around:
  - submit -> review -> approve/reject
  - archive/restore
  - admin force actions
  - profile-content visibility filtering
  - storage cleanup behavior

---

## 6) Phase Implementation Status

### Phase 1 Completed (2026-03-17)

- Enforced server-side draft-only creation for mentor content (`POST /api/mentors/content` now sets status to `DRAFT`).
- Hardened mentor update flow:
  - blocked direct privileged status jumps
  - blocked editing for non-editable workflow states
  - added archive/restore transition checks
  - added audit writes for archive/restore transitions
- Converted mentor root delete to soft delete behavior (`DELETE /api/mentors/content/[id]` now archives instead of hard-deleting).
- Hardened admin review route:
  - added canonical review-action to audit-action mapping
  - made status update + audit write transactional
  - changed `FORCE_DELETE` to non-destructive archive + lock behavior (no immediate hard delete)
  - required reason for `FORCE_DELETE`
- Made submit-review status update + audit insert transactional.
- Updated admin/mentor UI copy to reflect soft-delete semantics.
- Removed stale publish option from create-content dialog; creation is draft-first.

### Still Pending (Next Phases)

- Full lifecycle audit coverage for all delete/archive variants across nested entities.
- Authorization consistency cleanup in all deep module/section/item routes.
- Admin full-detail content view (replace placeholder).

### Phase 2 Completed (2026-03-17)

- Added soft-delete retention metadata fields in schema and migration:
  - `deletedAt`, `deletedBy`, `deleteReason`, `purgeAfterAt`
- Added delayed purge script:
  - `scripts/purge-deleted-mentor-content.ts`
  - npm command: `content:purge-deleted`
- Updated mentor/admin delete flows to set deletion metadata and 30-day purge window.
- Added storage cleanup hooks for:
  - root file replacement
  - course thumbnail replacement
  - content-item replacement/delete
  - module/section delete cascades
- Mentor content listing now excludes soft-deleted items.
