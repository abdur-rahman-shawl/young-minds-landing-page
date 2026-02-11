# Subscription Policy Coverage Audit (Implementation Playbook)

This document tells a new developer exactly how to finish the policy coverage audit and migrate every entitlement‑sensitive endpoint to the policy runtime. It is intentionally explicit: what to check, why it matters, how to implement, and the exact code changes to make.

## Goal

Ensure every entitlement‑sensitive API endpoint uses the centralized policy system (`enforceFeature`/`consumeFeature`) and **no route performs ad‑hoc subscription checks**. This makes behavior consistent, prevents drift, and enables future CI guardrails.

## Why This Matters

1. **Consistency**: All 403s, upgrade prompts, and usage tracking behave the same.
2. **Safety**: Eliminates client‑controlled bypass paths and ambiguous “which subscription” selection for dual‑role users.
3. **Maintainability**: New gates are added in one place (policy registry) and used everywhere via the runtime.
4. **Auditability**: Enforcement behavior is centralized and easy to review.

## Current Architecture (Required Context)

### Policy Registry
`lib/subscriptions/policies.ts`
- Defines action names and maps each action to:
  - `featureKey`
  - `audience` (`mentor` or `mentee`)
  - `actorRole` (`mentor`/`mentee`/`admin`)
  - `metered` and default deltas

### Policy Runtime
`lib/subscriptions/policy-runtime.ts`
- `enforceFeature({ action, userId, ... })` calls `checkFeatureAccess`.
- `consumeFeature({ action, userId, ... })` calls `trackFeatureUsage`.
- Throws `SubscriptionPolicyError` with standard payload for 403s.

### Core Enforcement
`lib/subscriptions/enforcement.ts`
- Audience-aware resolution added.
- Explicit admin override supported via `allowAdminOverride`.

## What “Complete” Means

For every entitlement‑sensitive endpoint:

1. **Role guard** still exists (`requireMentor`, `requireMentee`, `requireAdmin`, or equivalent).
2. **All subscription checks** are via `enforceFeature`.
3. **All usage tracking** is via `consumeFeature`.
4. **No route** performs plan selection by “latest subscription” without audience context.
5. **No client‑controlled bypass** of subscription checks.

## Endpoints Already Migrated

Do NOT re‑implement these unless fixing a bug:

- `app/api/bookings/route.ts`
  - Uses policy runtime for mentee/mentor checks and metering.
- `app/api/sessions/route.ts`
  - Uses policy runtime for booking branch and metering.
- `app/api/messaging/threads/[id]/messages/route.ts`
- `app/api/messaging/requests/route.ts`
- `app/api/chat/route.ts`
- `app/api/ai-chatbot-messages/route.ts`
- `app/api/courses/[id]/enroll/route.ts`
- `app/api/analytics/mentor/route.ts`
- `app/api/student/learning-analytics/route.ts`
- `app/api/mentors/content/route.ts`
- `app/api/mentors/content/upload/route.ts`
- `app/api/bookings/[id]/cancel/route.ts`

## Required Audit Procedure (Step‑by‑Step)

### 1) Identify remaining entitlement‑sensitive endpoints

Run:
```
rg -n "checkFeatureAccess\\(|trackFeatureUsage\\(" app/api
```
If any call remains outside the policy runtime (not `enforceFeature`/`consumeFeature`), it must be migrated.

Also scan for feature gates in non‑API code (if any) and decide if they are purely UI or enforceable server‑side logic.

### 2) For each endpoint, ask:

1. Is this endpoint **billing‑sensitive**?
2. Which **feature keys** does it represent?
3. Who is the **actor**? (`mentor`, `mentee`, `admin`)
4. Which **audience** is billed? (`mentor` or `mentee`)
5. Is it **metered** (requires usage tracking)?
6. Does it involve **multiple actors** (e.g., booking affects both mentor and mentee)?

### 3) Add missing policies

If an action doesn’t exist in `ACTION_POLICIES`, add it. Example:
```ts
  'recordings.access': {
    action: 'recordings.access',
    featureKey: FEATURE_KEYS.SESSION_RECORDINGS_ACCESS,
    audience: 'mentor',
    actorRole: 'mentor',
    metered: false,
    defaultFailureMessage: 'Session recordings are not included in your plan',
  },
```

### 4) Replace old checks with policy runtime

Pattern to use in every endpoint:
```ts
try {
  await enforceFeature({
    action: 'some.action',
    userId: targetUserId,
    failureMessage: 'Optional custom message',
  });
} catch (error) {
  if (isSubscriptionPolicyError(error)) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  throw error;
}
```

And after the action succeeds:
```ts
await consumeFeature({
  action: 'some.action',
  userId: targetUserId,
  resourceType: 'resource_type',
  resourceId: createdId,
});
```

### 5) Remove all direct `checkFeatureAccess` or `trackFeatureUsage` calls

No direct calls should remain in API routes after migration.

## Known Remaining Gaps (As of 2026‑02‑06)

These endpoints were the remaining gaps and are now migrated:

1. `app/api/public-mentors/route.ts`
   - Migrated to policy runtime.
   - Uses `ai.search.sessions`, `ai.search.sessions_monthly`, and `mentor.ai.visibility`.
   - Usage tracking now uses `consumeFeature`.

2. `app/api/mentors/[id]/booking-eligibility/route.ts`
   - Migrated to policy runtime.
   - Uses `mentor.free_session_availability`, `mentor.paid_session_availability`, and `booking.mentor.session`.

3. `app/api/sessions/[sessionId]/recordings/route.ts`
   - Migrated to policy runtime.
   - Uses `recordings.access.mentor` or `recordings.access.mentee` based on participant role.

4. `app/api/recordings/[id]/playback-url/route.ts`
   - Migrated to policy runtime.
   - Resolves session from recording -> room -> session to pick the correct audience action.

5. `app/api/chat/route.ts` and `app/api/ai-chatbot-messages/route.ts`
   - Already migrated, but ensure they use correct audience (`mentee` vs `mentor`) if product rules say mentors also use AI.

6. Messaging policies
   - Current policy actions (`messaging.direct_message`, `messaging.request`) are set to `audience: 'mentee'`.
   - Validate if mentors also send messages under mentor plans. If yes, policy audience must be dynamic or split into mentor/mentee actions.

## Exact Code Changes for Each Known Gap

### 1) `app/api/public-mentors/route.ts`

**Step A: Add actions to policy registry** (done)

Edit `lib/subscriptions/policies.ts` and add:
```ts
  'ai.search.sessions': {
    action: 'ai.search.sessions',
    featureKey: FEATURE_KEYS.AI_SEARCH_SESSIONS,
    audience: 'mentee',
    actorRole: 'mentee',
    metered: true,
    defaultDelta: { count: 1 },
    defaultResourceType: 'ai_search',
    defaultFailureMessage: 'AI search not included in your plan',
  },
  'ai.search.sessions_monthly': {
    action: 'ai.search.sessions_monthly',
    featureKey: FEATURE_KEYS.AI_SEARCH_SESSIONS_MONTHLY,
    audience: 'mentee',
    actorRole: 'mentee',
    metered: true,
    defaultDelta: { count: 1 },
    defaultResourceType: 'ai_search',
    defaultFailureMessage: 'AI search not included in your plan',
  },
  'mentor.ai.visibility': {
    action: 'mentor.ai.visibility',
    featureKey: FEATURE_KEYS.AI_VISIBILITY,
    audience: 'mentor',
    actorRole: 'mentor',
    metered: true,
    defaultDelta: { count: 1 },
    defaultResourceType: 'mentor_profile',
    defaultFailureMessage: 'AI visibility is not included in your plan',
  },
```

**Step B: Replace direct checks in route** (done)

In `app/api/public-mentors/route.ts`, replace:
```ts
const primary = await checkFeatureAccess(...)
```
with:
```ts
await enforceFeature({ action: 'ai.search.sessions', userId: requesterId })
```
and fallback to `ai.search.sessions_monthly` as needed.

Replace all `trackFeatureUsage` with:
```ts
await consumeFeature({ action: 'ai.search.sessions', userId: requesterId, resourceType: 'ai_search' });
```

For mentor visibility tracking:
```ts
await consumeFeature({
  action: 'mentor.ai.visibility',
  userId: row.userId,
  resourceType: 'mentor_profile',
  resourceId: row.id,
});
```

### 2) `app/api/mentors/[id]/booking-eligibility/route.ts`

Replace:
```ts
checkFeatureAccess(id, FEATURE_KEYS.FREE_VIDEO_SESSIONS_MONTHLY)
```
with:
```ts
await enforceFeature({ action: 'booking.mentee.free_session', userId: id });
```

Replace mentor session check:
```ts
await enforceFeature({ action: 'booking.mentor.session', userId: id });
```

### 3) `app/api/sessions/[sessionId]/recordings/route.ts`

Add policy actions (done):
```ts
'recordings.access.mentor': {
  action: 'recordings.access.mentor',
  featureKey: FEATURE_KEYS.SESSION_RECORDINGS_ACCESS,
  audience: 'mentor',
  actorRole: 'mentor',
  metered: false,
  defaultFailureMessage: 'Session recordings are not included in your plan',
}
'recordings.access.mentee': {
  action: 'recordings.access.mentee',
  featureKey: FEATURE_KEYS.SESSION_RECORDINGS_ACCESS,
  audience: 'mentee',
  actorRole: 'mentee',
  metered: false,
  defaultFailureMessage: 'Session recordings are not included in your plan',
}
```

Then replace direct check with:
```ts
const recordingsAction =
  userId === sessionData.mentorId ? 'recordings.access.mentor' : 'recordings.access.mentee';
await enforceFeature({ action: recordingsAction, userId });
```

### 4) `app/api/recordings/[id]/playback-url/route.ts`

Same actions as above, but this route must resolve the session for role:
```ts
const recording = await db.query.livekitRecordings.findFirst({
  where: eq(livekitRecordings.id, recordingId),
  with: { room: { with: { session: true } } },
});
if (!recording?.room?.session) { /* 404 */ }
const sessionData = recording.room.session;
const recordingsAction =
  userId === sessionData.mentorId ? 'recordings.access.mentor' : 'recordings.access.mentee';
await enforceFeature({ action: recordingsAction, userId });
```

### 5) Messaging audience validation

If mentors can message, add mentor equivalents:
```ts
'messaging.direct_message.mentor': {
  action: 'messaging.direct_message.mentor',
  featureKey: FEATURE_KEYS.DIRECT_MESSAGES_DAILY,
  audience: 'mentor',
  actorRole: 'mentor',
  metered: true,
  defaultDelta: { count: 1 },
  defaultResourceType: 'message',
}
```
Then select action at runtime based on sender role.

## Enforcement Payload Contract

All enforcement failures should return:
```json
{
  "success": false,
  "error": "Message limit reached",
  "details": "Feature 'direct_messages_daily' not included in your plan",
  "feature": "direct_messages_daily",
  "limit": 10,
  "usage": 10,
  "remaining": 0,
  "upgrade_required": true
}
```

`SubscriptionPolicyError` already provides this payload.

## Final Verification Checklist

1. `rg -n "checkFeatureAccess\\(" app/api` returns **0** results.  
2. `rg -n "trackFeatureUsage\\(" app/api` returns **0** results.  
3. All entitlement‑sensitive routes call `enforceFeature` and `consumeFeature`.  
4. All policy actions are declared in `ACTION_POLICIES`.  
5. No client‑controlled bypass logic remains.  
6. CI guardrail passes: `pnpm subscription:policy-guard`.  

## Current State (As of 2026‑02‑06)

All known gaps above are migrated. `rg` checks are clean. CI guardrail added:
- `scripts/check-subscription-policy-usage.sh`
- `pnpm subscription:policy-guard`

Messaging audience audit completed:
- Policy actions split by audience: `messaging.direct_message.mentor|mentee` and `messaging.request.mentor|mentee`.
- Direct message enforcement now derives audience from the request record used to grant permissions.
- Message request enforcement uses `requestType` to select the correct audience action.

Client-controlled bypass audit:
- Removed conditional rollback based on `bookingSource` in cancel flow. Usage rollback is now consistent.

## Summary

Use the policy registry for every subscription gate. If you cannot map a check to a policy action, the policy system is incomplete and must be expanded first. The end state is simple:

- API route calls `enforceFeature` before action
- API route calls `consumeFeature` after success
- No ad‑hoc subscription logic anywhere
