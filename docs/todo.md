# App-Wide Policy Checklist

This checklist tracks the centralized access-policy rollout across the app. A task is only marked complete when the source of truth is centralized, the server enforces it authoritatively, the UI consumes the same policy outcome, and targeted verification exists.

## Core Principles

- [x] Centralize access decisions by capability, not by page-level booleans
- [x] Make the server authoritative for protected operations
- [x] Expose policy snapshots to the client so UI and server stay aligned
- [x] Model mentor verification as lifecycle state, not ad hoc view logic
- [x] Treat account state, subscription entitlements, and payment state as first-class policy inputs
- [x] Eliminate remaining drift where local role, status, or subscription checks still bypass the policy engine
- [x] Ensure protected navigation and protected queries stop early instead of fetching and then rendering a blocker
- [x] Add formal verification for every major policy surface with matrix-style tests
- [x] Add request-scope caching so repeated policy reads in the same request path do not duplicate work
- [x] Add structured policy-denial audit logs for support, observability, and incident review
- [x] Unify denial error contracts across route handlers, services, and tRPC procedures

## Completed Foundation

- [x] Account access snapshot
  Source: `lib/access-policy/account.ts`
  Covers authentication, inactive accounts, blocked accounts, and override scopes.
- [x] Mentor capability policy snapshot
  Source: `lib/mentor/access-policy.ts`
  Covers verification, payment, subscription-derived features, and admin override scopes.
- [x] Mentee capability policy snapshot
  Source: `lib/mentee/access-policy.ts`
  Covers learning, analytics, AI chat, recordings, messaging, and subscription management.
- [x] Mentor verification state machine
  Source: `lib/mentor/verification-state-machine.ts`
  Used by mentor application flows, profile updates, and admin review actions.
- [x] Session bootstrap wiring
  Sources: `lib/auth/server/session-with-roles.ts`, `contexts/auth-context.tsx`
  Exposes `accountAccess`, `mentorAccess`, and `menteeAccess` to the client.
- [x] Mentor dashboard and availability gating
  Sources:
  - `components/dashboard/dashboard-experience.tsx`
  - `components/mentor/dashboard/mentor-only-dashboard.tsx`
  - `components/mentor/availability/mentor-availability-manager.tsx`
- [x] Initial server-side enforcement rollout
  Sources:
  - `lib/analytics/server/service.ts`
  - `lib/bookings/server/runtime-service.ts`
  - `lib/bookings/server/service.ts`
  - `lib/chatbot/server/message-service.ts`
  - `lib/content/server/service.ts`
  - `lib/learning/server/service.ts`
  - `lib/mentor/server/availability-service.ts`
  - `lib/recordings/server/service.ts`

## Current Rollout Checklist

### 1. Messaging Coverage

- [x] Centralize mailbox access resolution for mentors, mentees, and admins
- [x] Centralize message-request capability resolution
- [x] Centralize direct-message capability resolution
- [x] Enforce centralized messaging access in messaging server services
- [x] Enforce centralized messaging access in the SSE endpoint
- [x] Remove messaging-specific UI drift that still relies on raw subscription checks
- [x] Make unread-count fetches and SSE subscriptions policy-aware so restricted users do not fetch messaging data anyway
- [x] Add targeted tests for the messaging policy adapter and mentor messaging entitlements

### 2. Duplicate Authorization Cleanup

- [x] Replace remaining direct subscription UI checks on active protected surfaces with policy-snapshot reads
- [x] Replace remaining local role/status checks that duplicate centralized access policy where practical
- [x] Move remaining feature-specific gating logic behind reusable access helpers instead of per-file logic

### 3. Navigation And Fetch Discipline

- [x] Make mentor sidebar navigation feature-aware, not only route-aware
- [x] Make mentee sidebar navigation feature-aware, not only route-aware
- [x] Make all protected widgets stop fetching when access is denied
- [x] Ensure standalone surfaces outside the dashboard shell also use the centralized policy outcome

### 4. Procedure And Service Boundaries

- [x] Introduce reusable server-side access assertion helpers so feature enforcement is harder to forget
- [x] Introduce feature-aware tRPC procedure helpers where that meaningfully reduces duplication
- [x] Consolidate tRPC router error mapping behind the shared `lib/trpc/router-error.ts` adapter
- [x] Align route handlers and tRPC handlers on the same denial payload shape

### 5. Hardening And Observability

- [x] Add request-scope caching for resolved policy snapshots
- [x] Add structured policy-denial logging with feature keys and reason codes
- [ ] Add richer lifecycle/state-machine coverage for non-mentor account states if product rules need it
- [x] Add a broader cross-product test matrix for account state, role, subscription, payment, and override combinations

### 6. Dynamic Runtime Matrix

- [x] Introduce a versioned access-policy config store for constrained runtime overrides
- [x] Keep policy logic in code while allowing validated state-cell overrides in data
- [x] Layer published overrides onto the baseline mentor and mentee policy matrices
- [x] Cache resolved runtime policy config once per request path
- [x] Expose runtime policy metadata in session bootstrap for client awareness
- [x] Add admin draft, publish, and reset operations for the access-policy matrix
- [x] Add focused tests for runtime config merge and admin publish flow

### 7. Lifecycle Vocabulary And Runtime Admin Controls

- [x] Define the current safe lifecycle vocabulary for account, mentor verification, mentor payment, mentor subscription, and mentee subscription policy axes
- [x] Keep current hard-coded behavior as the code baseline instead of adding unsupported states without source data
- [x] Document how new lifecycle states become data-driven only after source data, normalizers, baseline behavior, schema validation, server enforcement, UI consumption, tests, and docs exist
- [x] Expose the access-policy matrix in admin Policy Settings so runtime overrides can be edited as constrained cells, saved as drafts, and published intentionally
- [x] Support removing individual overrides by returning cells to the code baseline
- [x] Preserve audit-backed admin draft, reset, and publish operations for access-policy config changes

## Active Focus

1. Apply `lib/db/migrations/0048_add_access_policy_configs.sql` in the real environment before relying on runtime policy edits outside local/dev.
2. Add future lifecycle states only when the source facts exist. Candidate states are documented in `docs/access-policy-lifecycle-model.md`, but they should not be added as runtime choices until the app can prove them from trusted data.
3. Resolve repo-wide verification blockers surfaced by the full non-build verification pass:
   - `npm run lint` is blocked by an ESLint 10 / `eslint-config-next` / `eslint-plugin-react` incompatibility that crashes while loading React rules on normal app files.
   - `./node_modules/.bin/tsc --noEmit` still fails on broad pre-existing TypeScript debt across unrelated routes, pages, schemas, scripts, and some older service files outside the policy core.
   - `npm test` now passes the policy-focused suites, but the full suite still has two failing route-test suites and three Vitest worker-start timeouts:
     - `tests/app/api/ai-chatbot-messages.route.test.ts`
     - `tests/app/api/sessions.route.test.ts`
     - worker timeouts in dashboard/messaging component suites
4. Run a production build only after the user explicitly allows a heavy verification pass.
