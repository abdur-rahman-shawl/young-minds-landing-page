# Audit Logging Design

## Goals
- Provide a flexible, append-only audit log that scales with growth.
- Keep the schema stable for future extraction into a dedicated audit service.
- Store all audit logs in the primary database for now.
- Allow domain-specific audit needs without fragmenting the core design.

## Non-Goals
- Selecting concrete audit points in the codebase.
- Building a UI or reporting layer.
- Implementing a cross-service event bus.

## Current State
- Multiple audit tables exist (admin actions, mentor/mentee profile audits, consent events).
- Patterns vary across tables, making cross-cutting queries and long-term maintenance harder.

## Proposed Direction
- Introduce a unified `audit_events` table for all generic audit records.
- Keep domain-specific tables only when they provide specialized indexing or storage needs.
- Wrap audit creation in a small library to keep application code stable if a microservice is introduced later.
- Add a lightweight `email_events` table for high-volume email tracking without full audit payloads.

## Data Model (Core Table)
Suggested schema for `audit_events`:
- `id` (uuid, PK)
- `occurred_at` (timestamp, not null, default now)
- `actor_type` (text, e.g., `user`, `admin`, `system`, `service`)
- `actor_id` (text, nullable for system events)
- `actor_role` (text, optional snapshot for convenience)
- `action` (text, not null, e.g., `mentor.profile.updated`)
- `resource_type` (text, not null, e.g., `mentor`, `mentee`, `session`)
- `resource_id` (text, nullable if not tied to a specific record)
- `status` (text, optional, e.g., `success`, `failure`)
- `request_id` (text, optional, for tracing)
- `trace_id` (text, optional, for future distributed tracing)
- `ip_address` (text, optional)
- `user_agent` (text, optional)
- `details` (jsonb, optional, free-form metadata)
- `diff` (jsonb, optional, structured before/after changes)
- `schema_version` (int, default 1)

Notes:
- All variable or domain-specific data goes into `details` or `diff`.
- `action` should be a namespaced string (`domain.verb[.subverb]`) to keep it stable.
- When deprecating fields, keep them nullable and bump `schema_version` for new records.

## Indexing Strategy
- Composite index: (`resource_type`, `resource_id`, `occurred_at`).
- Composite index: (`actor_id`, `occurred_at`).
- Index on `action` for targeted searches.
- Consider time-based partitioning by month/quarter once table grows.

## Access Patterns
- By resource: show history for a mentor/mentee/admin entity.
- By actor: show all actions by a user/admin.
- By action: find specific events (e.g., `mentor.status.approved`).
- By email: filter by recipient, template, or action for delivery audits.

## Retention and Compliance
- Keep audit logs immutable (no updates/deletes).
- If retention policies are required later, archive or partition-drop older data.
- Avoid storing raw secrets or sensitive payloads in `details`/`diff`.

## Service Boundary Strategy
- Introduce an internal `audit` library that exposes a stable function like
  `recordAuditEvent({ action, actor, resource, details })`.
- The library should own request/trace context and normalize the shape.
- When moving to microservices, swap the implementation to write to a dedicated
  audit DB or publish to a queue without touching call sites.

## Migration Strategy
- New audit points should write to `audit_events`.
- Existing domain-specific tables can remain for now.
- Optionally backfill older entries into `audit_events` if unified reporting is needed.

## Open Questions
- Do we need to cryptographically sign events or add a write-once log layer?
- What retention period should apply for compliance and cost?
- Which events require full `diff` versus metadata only?
