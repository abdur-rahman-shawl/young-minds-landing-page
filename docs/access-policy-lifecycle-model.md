# Access Policy Lifecycle Model

This document defines the safe vocabulary behind the app-wide access-policy engine. The runtime policy matrix is data-driven only inside this vocabulary: admins can change validated outcomes for known policy cells, but they cannot create arbitrary code paths or invent lifecycle states that the application cannot prove from trusted data.

## Current Production Model

The code baseline remains the source of truth when no published runtime config exists. A published row in `access_policy_configs` can override individual matrix cells, but each override is validated against the same typed states and reason codes used by the server.

Sources:

- `lib/access-policy/account.ts`
- `lib/mentor/access-policy.ts`
- `lib/mentee/access-policy.ts`
- `lib/access-policy/runtime-config.ts`
- `lib/access-policy/lifecycle-model.ts`
- `lib/access-policy/admin-service.ts`

## Account Lifecycle Vocabulary

These states apply to both mentors and mentees before feature-specific checks.

- `anonymous`: no authenticated account exists for the request.
- `active`: the user is authenticated, active, and not blocked. This is intentionally not configurable because it is the success path.
- `inactive`: the account exists but is not currently active.
- `blocked`: the account is explicitly restricted.
- `unavailable`: the account flags could not be resolved safely.

Configurable account states:

- `anonymous`
- `inactive`
- `blocked`
- `unavailable`

Allowed account reason codes:

- `ok`
- `authentication_required`
- `account_inactive`
- `account_blocked`
- `account_state_unavailable`

## Mentor Vocabulary

Mentor feature policy uses four axes: account lifecycle, mentor verification, mentor activation payment, and subscription entitlement state.

Mentor verification states:

- `YET_TO_APPLY`: the mentor has not submitted a verification application.
- `IN_PROGRESS`: the application is submitted and under review.
- `VERIFIED`: the mentor has passed verification.
- `REJECTED`: the application was reviewed and not approved.
- `REVERIFICATION`: the mentor must take action before approval continues.
- `RESUBMITTED`: the mentor resubmitted after a requested change.
- `UPDATED_PROFILE`: the mentor changed profile data that needs review.
- `UNKNOWN`: the stored verification status is not recognized.

Mentor payment states:

- `PENDING`: activation payment is not completed yet.
- `COMPLETED`: activation payment is completed.
- `FAILED`: activation payment failed.
- `REFUNDED`: activation payment was refunded.
- `CANCELLED`: activation payment was cancelled.
- `UNKNOWN`: stored payment status is not recognized.

Mentor subscription policy states:

- `missing`: no active mentor subscription exists.
- `notInPlan`: a mentor plan is loaded, but it does not include the feature.
- `unavailable`: subscription entitlements could not be resolved safely.

## Mentee Vocabulary

Mentee feature policy uses account lifecycle and subscription entitlement state.

Mentee subscription policy states:

- `missing`: no active mentee subscription exists.
- `notInPlan`: a mentee plan is loaded, but it does not include the feature.
- `unavailable`: subscription entitlements could not be resolved safely.

The current model intentionally does not add new mentee onboarding, payment delinquency, suspension, grace-period, or reactivation states until a trusted source field or event stream exists for those facts.

## Runtime Admin Settings

The admin runtime settings path is intentionally constrained:

1. Admin edits validated matrix cells in the Access Policies tab under Policy Settings.
2. The UI writes a draft through `admin.upsertAccessPolicyDraft`.
3. The service validates the payload through `accessPolicyConfigOverridesSchema`.
4. Admin publishes the draft through `admin.publishAccessPolicyDraft`.
5. The previous published config is archived.
6. Runtime policy resolution reads the newest published config and layers it onto the code baseline.
7. If the config table is unavailable during rollout, the system uses the code baseline rather than arbitrary partial config.

This is data-driven at the policy-outcome level, not arbitrary business logic. Examples of safe runtime edits:

- Allow `mentor.schedule.manage` while verification is `IN_PROGRESS`.
- Block `mentee.learning.workspace` when subscription state is `missing`.
- Return `subscription_unavailable` when entitlements cannot be resolved.
- Restore any cell to `Use baseline` so the hard-coded production default applies again.

## How To Add A New Lifecycle State

Do not add a new state only because the UI wants to show a label. A new lifecycle state must have all of the following:

1. A trusted source of truth: database column, payment-provider event, subscription engine result, or audited admin action.
2. A normalizer that maps unknown values to a safe `UNKNOWN` or `unavailable` state.
3. A reason-code vocabulary that describes allowed outcomes.
4. Baseline behavior in code before runtime overrides are allowed.
5. Runtime-config schema support so admin payloads are constrained.
6. Server enforcement through the centralized policy helpers.
7. Client rendering from the same policy snapshot, not duplicated local checks.
8. Tests that cover allowed, blocked, unknown, override, and admin-publish behavior.
9. Documentation in this file and `docs/todo.md`.

Recommended future states only after source data exists:

- Account or subscription suspension: `suspended`.
- Payment delinquency: `payment_delinquent`.
- Subscription grace period: `grace_period`.
- Reactivation workflow: `pending_reactivation`.
- Mentee onboarding: `onboarding_incomplete`.

Until those facts are modeled in the database or entitlement layer, the correct production behavior is to keep the existing baseline states and use `unavailable`/`UNKNOWN` for unsafe uncertainty.
