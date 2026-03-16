# Mentor Content Module — Flaws & Improvements Audit

> **Date**: 2026-03-15
> **Scope**: All issues, flaws, and improvement opportunities identified during the low-level review of the mentor content module.
> **Status**: Documented for future reference. No changes made yet.

---

## 🔴 Critical Issues

### 1. File Size Mismatch (UI vs Server)
- **UI shows**: 500 MB (VIDEO), 50 MB (DOCUMENT)
- **Server enforces**: 100 MB for ALL file types
- **Impact**: Mentor uploads a 200 MB video → long upload → cryptic error
- **Fix**: Add client-side `file.size` check before upload; align UI labels with actual limits

### 2. No Per-Type File Size Limits
- Server applies one flat 100 MB cap for all types; a 95 MB PDF shouldn't be allowed
- **Fix**: Type-specific limits — e.g., `VIDEO → 500 MB (chunked)`, `DOCUMENT → 25 MB`, `IMAGE → 10 MB`

### 3. No Duplicate Content Detection
- Same title + type can be created multiple times with zero warning
- **Fix**: Check for `title` + `type` per mentor before creation; warn (don't block)

### 4. SEO / Advanced Fields Collected But Never Saved
- **Fields**: `seoTitle`, `seoDescription`, `maxStudents`, `isPublic`, `allowComments`, `certificateTemplate`, `allowDownload`
- All collected in `CreateCourseDialog` / `CreateContentItemDialog` but silently dropped by the API
- **Impact**: Mentors fill these out thinking they're persisted — trust breach
- **Fix**: Either add DB columns and persist, or remove from the UI

---

## 🟠 Security Issues

### 5. Two Inconsistent Auth Patterns
- Older routes: inline `auth.api.getSession()` + manual mentor lookup
- Newer routes: `requireMentor()` guard with admin bypass
- **Risk**: Harder to audit; potential for subtle bugs in one pattern
- **Fix**: Refactor ALL routes to use `requireMentor()` consistently

### 6. No Rate Limiting on Upload
- `POST /api/upload` has no throttle — a malicious user can flood Supabase Storage
- **Fix**: Add rate limiting (e.g., 10 uploads/min per user) via middleware or `rate-limiter-flexible`

### 7. No File Content Validation (MIME Spoofing)
- Upload checks `file.type` (browser-reported) and file extension, but never inspects actual file bytes
- A `.exe` renamed to `.pdf` would pass
- **Fix**: Use `file-type` library to verify magic bytes server-side

### 8. No CSRF Protection on Upload
- `POST /api/upload` accepts `multipart/form-data` with session cookie — CSRF-vulnerable
- **Fix**: Add CSRF token validation or enforce `SameSite=Strict` cookies

---

## 🟡 Data Integrity Issues

### 9. Duration Unit Confusion
- Frontend form: **minutes** → `CreateContentItemDialog` converts `× 60` → API/DB: **seconds**
- But `courses.duration_minutes` stores **minutes** directly
- **Risk**: Future devs will introduce bugs mixing units
- **Fix**: Standardize on one unit (seconds); create shared helpers: `minutesToSeconds()`, `secondsToMinutes()`

### 10. JSON-Stringified Arrays Instead of Native PG Arrays
- `tags`, `prerequisites`, `learningOutcomes`, `platformTags`, `learningObjectives` — all stored as `TEXT` with `JSON.stringify()`
- **Issues**: Can't query/filter by tag, can't index, requires `safeJsonParse` everywhere
- **Fix**: Migrate to PostgreSQL `text[]` array columns; Drizzle supports `text('col').array()`

### 11. No Soft Delete
- All deletes are hard + cascading — accidental module delete wipes all child data permanently
- **Fix**: Add `deleted_at` column, soft-delete pattern, "Recently Deleted" UI section, hard-delete after 30 days

### 12. No Optimistic Locking
- Two browser tabs can edit the same content; last write wins silently
- **Fix**: Add `version` integer column, increment on update, reject if submitted version doesn't match current

---

## 🔵 Performance Issues

### 13. N+1 Query Problem on Course Fetch
- `GET /api/mentors/content/[id]` (COURSE) does nested `Promise.all` loops: modules → sections → items
- 10 modules × 5 sections × 5 items = **250+ separate queries**
- **Fix**: Use Drizzle `with` relations or a single JOIN query returning the full tree

### 14. Module Reorder = N PUT Requests
- Reordering fires `Promise.all(modules.map(PUT))` — 10 modules = 10 API calls
- **Fix**: Create `PATCH /api/.../modules/reorder` endpoint accepting `[{ id, orderIndex }]` in a single DB transaction

### 15. No Pagination on Content List
- `GET /api/mentors/content` returns ALL content at once
- 500+ items → massive payload, slow rendering
- **Fix**: Add `?page=1&limit=20` with cursor-based or offset pagination

### 16. Client-Side Tab Filtering
- Tab filtering (courses/files/urls) fetches everything then filters via `useMemo`
- **Fix**: Add `?type=COURSE` server-side filter; fetch only the active tab's data

---

## 🟣 UX / Best Practice Issues

### 17. No Content Versioning / History
- Edits overwrite permanently; no way to revert
- **Fix**: Add `content_versions` table; snapshot changes; show "Version History" in edit dialog

### 18. No Draft Auto-Save for Course Creation
- If mentor fills 3 tabs of course form and closes the dialog, everything is lost
- **Fix**: Persist form drafts in `localStorage` by `contentId`; restore on re-open

### 19. Fake Upload Progress Bar
- Progress bar in `CreateContentItemDialog` jumps 10% → 70% → 90% → 100% at hardcoded points
- **Fix**: Use `XMLHttpRequest.upload.onprogress` or `tus-js-client` for real progress tracking

### 20. No File Preview Before Upload
- No video thumbnail, no PDF first-page, no image preview before submission
- **Fix**: Client-side thumbnail for images/video; `pdf.js` for PDF preview

### 21. No Content Search
- No way to search by title/description/tag
- **Fix**: Add search input → debounced `GET /api/mentors/content?search=react`

### 22. No Bulk Operations
- Can't multi-select content items for batch delete/archive/publish
- **Fix**: Multi-select checkboxes + bulk action toolbar

### 23. Template Content Items Are Planning-Only
- `CreateSectionDialog` templates pre-fill content items in UI, but they're never persisted to `section_content_items` table
- Mentor must manually re-create each one via `CreateContentItemDialog`
- **Fix**: On section creation, also insert placeholder `section_content_items` rows (metadata only, no file uploads)

### 24. No Drag-and-Drop for Sections / Content Items
- Only modules support `@dnd-kit` reordering; sections and items need manual `orderIndex` editing
- **Fix**: Add `@dnd-kit` sortable at section and content item levels too

---

## 🟢 Architecture / Code Quality

### 25. Inline Mutations vs Shared Hooks
- 4 components define their own `useMutation` inline instead of shared hooks in `use-content-queries.ts`
- **Components**: `CreateModuleDialog`, `CreateSectionDialog`, `CreateContentItemDialog`, `EditItemDialog`
- **Fix**: Extract to shared hooks: `useCreateModule()`, `useCreateSection()`, `useCreateContentItem()`, etc.

### 26. Direct `fetch` in Components
- `EditItemDialog` and `CourseBuilder.handleDelete` use raw `fetch()` — no loading/error states, no retry, no deduplication
- **Fix**: Convert to shared React Query mutation hooks

### 27. Missing Input Sanitization
- Text content and descriptions stored as-is — if ever rendered with `dangerouslySetInnerHTML`, XSS is possible
- **Fix**: Sanitize server-side using `sanitize-html` or `DOMPurify`

### 28. No Shared API Response Types
- API routes return untyped JSON; frontend uses manually-maintained TS interfaces
- **Fix**: Share Zod schemas between API and frontend for end-to-end type safety (or adopt tRPC)

---

## Priority Summary

| Priority | # | Issue | Effort |
|---|---|---|---|
| 🔴 Critical | 1 | File size mismatch UI/server | Low |
| 🔴 Critical | 2 | No per-type file size limits | Low |
| 🔴 Critical | 3 | No duplicate detection | Low |
| 🔴 Critical | 4 | Unpersisted SEO/advanced fields | Low–Med |
| 🟠 Security | 5 | Inconsistent auth patterns | Medium |
| 🟠 Security | 6 | No upload rate limiting | Low |
| 🟠 Security | 7 | MIME spoofing vulnerability | Low |
| 🟠 Security | 8 | CSRF on upload | Low |
| 🟡 Integrity | 9 | Duration unit confusion | Low |
| 🟡 Integrity | 10 | JSON arrays → native PG arrays | Medium |
| 🟡 Integrity | 11 | No soft delete | Medium |
| 🟡 Integrity | 12 | No optimistic locking | Medium |
| 🔵 Performance | 13 | N+1 course fetch | Medium |
| 🔵 Performance | 14 | Bulk reorder endpoint | Low |
| 🔵 Performance | 15 | Pagination | Medium |
| 🔵 Performance | 16 | Server-side tab filtering | Low |
| 🟣 UX | 17 | Content versioning | High |
| 🟣 UX | 18 | Draft auto-save | Low |
| 🟣 UX | 19 | Real upload progress | Medium |
| 🟣 UX | 20 | File preview before upload | Medium |
| 🟣 UX | 21 | Content search | Medium |
| 🟣 UX | 22 | Bulk operations | Medium |
| 🟣 UX | 23 | Persist template content items | Low |
| 🟣 UX | 24 | DnD for sections/items | Medium |
| 🟢 Code | 25 | Shared mutation hooks | Low |
| 🟢 Code | 26 | Remove direct fetch calls | Low |
| 🟢 Code | 27 | Input sanitization | Low |
| 🟢 Code | 28 | Shared API response types | Medium |
