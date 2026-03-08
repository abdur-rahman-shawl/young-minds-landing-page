# Dump vs Repo Schema Drift

## Scope

This document compares:

- `sharing_minds`
  - repo-managed schema created from the checked-in Drizzle migration chain
- `sharing_minds_dump`
  - sanitized import of `docker/backup.sql` containing the `public` schema from the exported Supabase dump

The goal is to identify schema drift between the current repository state and the imported production-like dump.

## Summary

The imported dump is not identical to the repo-managed schema.

The largest differences are:

- the dump contains several additional `public` tables not present in the repo-managed DB
- the dump has newer columns on `sessions`, `courses`, and subscription-related tables
- some JSON columns differ as `json` in the repo DB vs `jsonb` in the dump DB
- some subscription columns use stricter enums in the repo DB but plain `text` in the dump DB

## Tables Only In Repo-Managed DB

- `user`

This table exists in `sharing_minds` but not in the imported dump.

## Tables Only In Imported Dump

- `active_livekit_rooms`
- `admin_audit_trail`
- `content_item_reviews`
- `course_review_helpful_votes`
- `mentees_profile_audit`
- `mentors_form_audit_trail`
- `mentors_profile_audit`
- `reschedule_requests`

These objects exist in the imported dump but are not currently present in the repo-managed local schema.

## Shared Tables With Column Drift

### `ai_chatbot_messages`

- `metadata`
  - repo DB: `json`
  - dump DB: `jsonb`

### `courses`

Dump-only columns:

- `owner_type`
- `owner_id`
- `platform_tags`
- `platform_name`

### `learner_profiles`

- `preferred_learning_days`
  - repo DB: `json`
  - dump DB: `jsonb`
- `learning_reminders`
  - repo DB: `json`
  - dump DB: `jsonb`

### `learning_insights`

- `based_on_data`
  - repo DB: `json`
  - dump DB: `jsonb`

### `learning_sessions`

- `courses_accessed`
  - repo DB: `json`
  - dump DB: `jsonb`

### `mentor_content`

- `mentor_id`
  - repo DB: `uuid NOT NULL`
  - dump DB: `uuid NULL`

### `mentors`

Repo-only columns:

- `country_id`
- `state_id`
- `city_id`

Dump-only columns:

- `is_verified`
- `state`
- `search_mode`
- `is_expert`

### `reviews`

Dump-only columns:

- `status`

### `sessions`

Dump-only columns:

- `cancelled_by`
- `cancellation_reason`
- `no_show_marked_by`
- `no_show_marked_at`
- `recording_config`
- `mentor_reschedule_count`
- `refund_amount`
- `refund_percentage`
- `refund_status`
- `pending_reschedule_request_id`
- `pending_reschedule_time`
- `pending_reschedule_by`
- `booking_source`
- `was_reassigned`
- `reassigned_from_mentor_id`
- `reassigned_at`
- `reassignment_status`

### `subscription_feature_categories`

Dump-only columns:

- `is_active`
- `metadata`

### `subscription_plan_features`

Dump-only columns:

- `price_amount`
- `price_currency`
- `notes`
- `metadata`

Type/nullability drift:

- `limit_percent`
  - repo DB: `numeric`
  - dump DB: `integer`
- `limit_interval_count`
  - repo DB: `integer NOT NULL`
  - dump DB: `integer NULL`

### `subscription_plan_prices`

Dump-only columns:

- `intro_duration_intervals`
- `metadata`

### `subscription_team_members`

Dump-only columns:

- `metadata`

Type drift:

- `role`
  - repo DB: enum `subscription_team_member_role`
  - dump DB: `text`
- `status`
  - repo DB: enum `subscription_team_member_status`
  - dump DB: `text`

### `subscription_usage_events`

Type/nullability drift:

- `event_type`
  - repo DB: enum `subscription_usage_event_type`
  - dump DB: `text`
- `count_delta`
  - repo DB: `integer NOT NULL`
  - dump DB: `integer NULL`
- `minutes_delta`
  - repo DB: `integer NOT NULL`
  - dump DB: `integer NULL`
- `amount_delta`
  - repo DB: `numeric NOT NULL`
  - dump DB: `numeric NULL`

### `subscription_usage_tracking`

Dump-only columns:

- `metadata`

## Interpretation

The imported dump reflects a newer or separately evolved schema than the repo-managed migration chain.

The strongest signs of drift are:

- later session workflow fields present in the dump but missing from the repo-managed DB
- subscription tables in the dump carrying extra metadata and pricing fields not represented in the repo-managed schema
- repo-managed schema being stricter in some subscription areas through enums and non-null constraints
- some objects existing only in one side, indicating that not all production-side changes have been fully formalized in repo migrations

## Recommended Follow-Up

1. Decide whether the dump schema or repo schema is the intended source of truth for subscription tables.
2. Back-port dump-only production columns into checked-in Drizzle schema and migrations where they are still needed.
3. Review dump-only tables and determine whether they should be added to the repo migration chain or explicitly retired.
4. Standardize `json` vs `jsonb` usage, especially in analytics and learning tables.
5. Re-run the drift comparison after any schema formalization pass to confirm convergence.
