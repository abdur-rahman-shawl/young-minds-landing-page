# COMPLETE SUBSCRIPTION SYSTEM IMPLEMENTATION GUIDE

## FOR THE DEVELOPER CONTINUING THIS WORK

**Last Updated:** 2026-01-10
**Status:** Phase 1 Complete (Core Enforcement), Phase 2+ Pending
**Read Time:** 30 minutes
**Implementation Time Remaining:** 40-60 hours

---

## TABLE OF CONTENTS

1. [Project Context & Business Objectives](#1-project-context--business-objectives)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [What Has Been Built So Far](#3-what-has-been-built-so-far)
4. [Understanding The Database Schema](#4-understanding-the-database-schema)
5. [Understanding The Enforcement System](#5-understanding-the-enforcement-system)
6. [Current State: What Works Now](#6-current-state-what-works-now)
7. [Remaining Work: Complete Task List](#7-remaining-work-complete-task-list)
8. [Phase 2: Admin UI Completion](#8-phase-2-admin-ui-completion)
9. [Phase 3: User-Facing UI](#9-phase-3-user-facing-ui)
10. [Phase 4: Payment Integration](#10-phase-4-payment-integration)
11. [Testing & Validation](#11-testing--validation)
12. [Deployment & Rollout](#12-deployment--rollout)
13. [Troubleshooting Guide](#13-troubleshooting-guide)
14. [Code Examples & Patterns](#14-code-examples--patterns)

---

## QUICK START FOR NEW DEVELOPERS (READ THIS FIRST)

If you only read one section, read this.

### What Is Done Right Now

**Admin tooling**
- Plans list/create works
- Plan edit/delete works
- Plan feature assignment + limits editor works
- Feature edit dialog works
- Plan pricing editor works (add/toggle active prices)

**User experience**
- Subscription tab shows current plan + usage
- Plan list shows only the user's audience (mentor or mentee)
- "Select Plan" creates a subscription row (temporary, bypasses payment)

**Enforcement (active in code)**
- Sessions: mentor monthly session limits enforced
- Messaging: direct messages and message requests enforced
- AI: chatbot access + messages enforced
- Courses: enrollments enforced
- Recordings: access to list/playback enforced
- Analytics: mentor + mentee analytics endpoints gated
- Content uploads + posting gated for mentors

### What Is NOT Done Yet (Critical Gaps)

**Payments**
- No Stripe checkout
- No webhook handling
- No subscription creation from payments

**Upgrade/UX**
- "Select Plan" does not trigger payment
- No upgrade prompts on limit reached
- No pricing comparison page

**Enforcement gaps**
- Mentee session limits (free/paid/counseling) not enforced
- Session duration limits not enforced
- AI search visibility/appearance gating not enforced
- Knowledge hub / live sessions / partner offers / early access not enforced
- Team member limits not enforced

### The Next Best Step (for an LLM or a new dev)

1) Implement payment flow (Stripe) and replace the temporary "Select Plan"
   - Build: `lib/payments/stripe-client.ts`
   - API: `app/api/stripe/create-checkout-session/route.ts`
   - API: `app/api/stripe/webhook/route.ts`
   - Update "Select Plan" to create checkout and redirect

2) Finish enforcement for mentee session limits
   - Requires: a reliable way to classify session type (free/paid/counseling)
   - Add feature checks for:
     - `free_video_sessions_monthly`
     - `paid_video_sessions_monthly`
     - `counseling_sessions_monthly`
   - Place checks in booking/session creation endpoints

3) Add missing feature gates once endpoints exist
   - AI search visibility (mentor listing / search endpoints)
   - Knowledge hub access
   - Live sessions
   - Team member limits
   - Partner offers + early access

If you are starting work, begin with **Step 1 (Stripe)** unless business explicitly wants enforcement completion before payments.

---

## 1. PROJECT CONTEXT & BUSINESS OBJECTIVES

### What Is This Project?

**Young Minds** is a mentorship platform connecting mentors and mentees. It operates on a **freemium SaaS model** where users subscribe to different plans with varying feature limits.

### Business Model

- **Target Users:** Mentors and mentees (two separate user types)
- **Revenue Model:** Subscription-based (monthly/yearly)
- **Plan Types:** Basic, Pro, Pro Plus, Corporate (with team members)
- **Monetization:** Limit features like sessions, messages, AI chat, recordings, courses, etc.

### Core Value Proposition

Users can:
1. Book 1:1 video sessions with mentors
2. Send direct messages to mentors
3. Use AI chat assistant for guidance
4. Access courses and learning materials
5. View analytics dashboards
6. Record sessions with AI insights

**The Problem We're Solving:**
- Currently, there are NO limits - everyone has unlimited access to everything
- We need to gate features behind subscription plans
- We need to track usage and enforce limits
- We need admin controls to define plans dynamically
- We need payment integration for monetization

### Success Criteria

By the end of this implementation:
1. ✅ Users CANNOT exceed their plan limits (sessions, messages, AI chat)
2. ✅ Admins CAN create/edit plans with any features and any limits
3. ✅ Users CAN see their current usage and upgrade their plans
4. ✅ System TRACKS all usage for analytics and billing
5. ✅ Payment integration WORKS with Stripe/payment provider

---

## 2. SYSTEM ARCHITECTURE OVERVIEW

### Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS + shadcn/ui components

**Backend:**
- Next.js API Routes (serverless functions)
- Better-Auth for authentication
- Drizzle ORM (for PostgreSQL via local connection)
- Supabase (PostgreSQL + Realtime + Storage)

**Database:**
- Supabase PostgreSQL (remote)
- 71 tables total (before subscription additions)
- Row-Level Security (RLS) policies enabled

**External Services:**
- LiveKit (video conferencing)
- Google Gemini AI (chatbot)
- Stripe (payments - to be integrated)

### Architecture Decisions

**Why Two Database Clients?**
- **Drizzle ORM** (`@/lib/db`): Used for most application logic, connects to PostgreSQL
- **Supabase Client** (`@/lib/supabase/server`): Used ONLY for subscription system (RLS policies required)

**Why Supabase for Subscriptions?**
- Need Row-Level Security (RLS) policies for multi-tenant security
- Service role key allows admin operations
- Built-in auth context for user scoping
- Real-time subscriptions (future feature)

**Design Philosophy:**
- **Fail loudly:** No silent failures, always throw explicit errors
- **Dynamic everything:** No hardcoding, all configurable by admins
- **Audit trails:** Log all usage events for compliance
- **Security first:** RLS policies on all subscription tables

---

## 3. WHAT HAS BEEN BUILT SO FAR

### Database Schema (100% Complete)

**New Tables Created (via Supabase migrations):**

1. **`subscription_plans`** - Plan definitions
   - Fields: id, plan_key, audience (mentor/mentee), name, description, status, sort_order, metadata
   - 9 existing plans (4 mentee, 5 mentor)

2. **`subscription_features`** - Available features
   - Fields: id, feature_key, name, description, value_type, unit, is_metered, category_id, metadata
   - 45+ features seeded (sessions, messages, AI chat, courses, recordings, etc.)

3. **`subscription_feature_categories`** - Feature organization
   - Fields: id, category_key, name, description, icon, sort_order
   - 10 categories (Sessions, Messaging, AI Features, Learning, Analytics, etc.)

4. **`subscription_plan_features`** - Features assigned to plans
   - Fields: id, plan_id, feature_id, is_included, limit_count, limit_minutes, limit_text, limit_amount, limit_percent, limit_json, limit_interval, limit_interval_count
   - Junction table linking plans to features with limits

5. **`subscription_plan_prices`** - Pricing for plans
   - Fields: id, plan_id, price_type, billing_interval, billing_interval_count, amount, currency, is_active, effective_from, effective_to
   - Supports monthly/yearly/weekly/daily billing

6. **`subscriptions`** - User subscriptions
   - Fields: id, user_id, plan_id, price_id, status, quantity, current_period_start, current_period_end, trial_end, cancel_at, canceled_at, ended_at, auto_renew, provider, provider_customer_id, provider_subscription_id
   - Links users to their active plans

7. **`subscription_usage_tracking`** - Current usage metrics
   - Fields: id, subscription_id, feature_id, usage_count, usage_minutes, usage_amount, usage_json, period_start, period_end, interval_type, interval_count, limit_reached, limit_reached_at
   - Tracks usage per billing period

8. **`subscription_usage_events`** - Audit trail
   - Fields: id, subscription_id, feature_id, user_id, event_type, count_delta, minutes_delta, amount_delta, resource_type, resource_id, limit_exceeded
   - Complete log of all usage events

9. **`subscription_team_members`** - Team/corporate support
   - Fields: id, subscription_id, user_id, role, invited_by, invited_at, joined_at, status, removed_at, removed_by
   - For corporate plans with multiple users

**Enums Extended:**
- `subscription_billing_interval`: month, year, **week, day** (new)
- `subscription_feature_value_type`: boolean, count, minutes, text, amount, percent, json
- `subscription_plan_audience`: mentor, mentee
- `subscription_plan_status`: draft, active, archived
- `subscription_status`: trialing, active, past_due, paused, canceled, incomplete, expired
- `subscription_price_type`: standard, introductory

**RLS Policies (100% Complete):**
- ✅ All subscription tables have RLS enabled
- ✅ Helper functions: `is_admin()`, `has_subscription_access()`
- ✅ Users can view their own subscriptions + team subscriptions
- ✅ Admins can manage everything
- ✅ Public can view active plans (for pricing pages)
- ✅ Service role can track usage server-side

**Indexes Created:**
- Performance indexes on all foreign keys
- Composite indexes on common query patterns
- Partial indexes for active subscriptions

### Enforcement Utilities (100% Complete)

**File:** `lib/subscriptions/enforcement.ts`

**Functions Implemented:**

```typescript
// Get user's active subscription
getUserSubscription(userId: string): Promise<SubscriptionInfo>

// Get all features in user's plan
getPlanFeatures(userId: string): Promise<SubscriptionPlanFeature[]>

// Check if user can access a feature
checkFeatureAccess(userId: string, featureKey: string): Promise<FeatureAccess>

// Track usage of a metered feature
trackFeatureUsage(
  userId: string,
  featureKey: string,
  delta: { count?: number; minutes?: number; amount?: number },
  resourceType?: string,
  resourceId?: string
): Promise<void>

// Combined: check access AND track usage
enforceAndTrackFeature(
  userId: string,
  featureKey: string,
  delta: { count?: number; minutes?: number; amount?: number },
  resourceType?: string,
  resourceId?: string
): Promise<FeatureAccess>
```

**Key Features:**
- Throws errors if no subscription found (fail loudly)
- Returns detailed access info (has_access, limit, usage, remaining)
- Creates usage tracking records automatically
- Logs all events to audit trail
- Production-grade error handling

### Admin Dashboard UI (Partial Complete)

**Files Created:**

1. **`components/admin/dashboard/admin-subscriptions.tsx`**
   - Main subscription management dashboard
   - Stats cards (plans, features, active subscriptions)
   - Tabbed interface (Plans, Features, Subscriptions, Analytics)

2. **`components/admin/dashboard/subscriptions/plans-management.tsx`**
   - View all plans (mentors and mentees separated)
   - Filter by audience and status
   - Create new plans (dialog with form)
   - Edit plan status (draft/active/archived)
   - Plan cards with feature/price counts

3. **`components/admin/dashboard/subscriptions/features-management.tsx`**
   - View all features grouped by category
   - Search features
   - Display feature details (type, unit, metered status)

4. **`components/admin/dashboard/subscriptions/plan-feature-editor.tsx`**
   - Full plan-feature assignment UI
   - Dynamic limit editor by value type
   - Interval controls for metered features
   - Save updates per feature

4. **`components/admin/dashboard/subscriptions/subscriptions-overview.tsx`**
   - Placeholder for active subscriptions view

5. **`components/admin/dashboard/subscriptions/usage-analytics.tsx`**
   - Placeholder for usage analytics

**Navigation Updated:**
- ✅ Added "Subscriptions" to admin sidebar
- ✅ Integrated with dashboard routing
- ✅ Accessible at `/dashboard?section=subscriptions`

### Admin API Routes (Partial Complete)

**Files Created:**

1. **`app/api/admin/subscriptions/stats/route.ts`** (GET)
   - Returns: totalPlans, activePlans, totalFeatures, activeSubscriptions

2. **`app/api/admin/subscriptions/plans/route.ts`** (GET, POST)
   - GET: List all plans with feature/price counts
   - POST: Create new plan with validation

3. **`app/api/admin/subscriptions/features/route.ts`** (GET)
   - Returns all features with category names

4. **`app/api/admin/subscriptions/plans/[planId]/route.ts`** (PATCH, DELETE)
   - Update plan fields
   - Delete plan

5. **`app/api/admin/subscriptions/plans/[planId]/features/route.ts`** (GET, POST)
   - GET: List all features with assignment status for plan
   - POST: Upsert feature limits for plan (conflict-safe)

**Missing API Routes:**
- Feature creation/editing
- Usage analytics endpoints

### Feature Enforcement (Phase 1 Complete - 75%)

**Files Modified with Subscription Checks:**

1. **`app/api/bookings/route.ts`** ✅
   - **Line ~55:** Added subscription check BEFORE booking creation
   - **Line ~277:** Added usage tracking AFTER booking created
   - **Feature Key:** `'mentor_sessions_monthly'`
   - **Tracks:** count: 1, minutes: duration

2. **`app/api/sessions/route.ts`** ✅
   - **Line ~115:** Added subscription check in `action === 'book'` branch
   - **Line ~169:** Added usage tracking after session created
   - **Feature Key:** `'mentor_sessions_monthly'`
   - **Tracks:** count: 1, minutes: duration

3. **`app/api/messaging/threads/[id]/messages/route.ts`** ✅
   - **Line ~99:** REPLACED old `checkAndUpdateMessageQuota()` with subscription enforcement
   - Uses `enforceAndTrackFeature()` for combined check+track
   - **Feature Key:** `'direct_messages_daily'`
   - **Tracks:** count: 1

4. **`app/api/chat/route.ts`** ✅
   - **Line ~50:** Added authentication requirement
   - **Line ~61:** Check `'ai_helper_chat_access'` (boolean)
   - Returns 401/403 before AI streaming starts

5. **`app/api/ai-chatbot-messages/route.ts`** ✅
   - **Line ~73:** Added usage tracking after user message saved
   - **Feature Key:** `'ai_helper_messages_limit'`
   - **Tracks:** count: 1 per user message

6. **`app/api/messaging/requests/route.ts`** ✅
   - Added subscription check for message requests
   - Added usage tracking on successful request
   - **Feature Key:** `'message_requests_daily'`
   - **Tracks:** count: 1

7. **`app/api/courses/[id]/enroll/route.ts`** ✅
   - Added subscription check for course enrollments
   - Added usage tracking after enrollment
   - **Feature Key:** `'free_courses_limit'`
   - **Tracks:** count: 1

8. **`app/api/sessions/[sessionId]/recordings/route.ts`** ✅
   - Added subscription gating for recordings list
   - **Feature Key:** `'session_recordings_access'`

9. **`app/api/recordings/[id]/playback-url/route.ts`** ✅
   - Added subscription gating for playback access
   - **Feature Key:** `'session_recordings_access'`

**Enforcement Coverage:**
- ✅ Session bookings (primary endpoint)
- ✅ Session creation (secondary endpoint)
- ✅ Direct messaging (thread messages)
- ✅ AI chat access control
- ✅ AI chat usage tracking
- ✅ Message requests enforced
- ⏳ Legacy messaging API (not yet enforced)
- ⏳ Session rescheduling
- ✅ Course enrollments enforced
- ✅ Recording access enforced
- ⏳ Analytics access

---

## 4. UNDERSTANDING THE DATABASE SCHEMA

### Supabase vs Drizzle

**When to Use Supabase Client:**
```typescript
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

**Use for:**
- All `subscription_*` table queries
- Anything requiring RLS policies
- Admin operations with service role

**When to Use Drizzle ORM:**
```typescript
import { db } from '@/lib/db';
```

**Use for:**
- All other application tables (sessions, messages, users, etc.)
- Complex joins and queries
- Type-safe database operations

### Key Relationships

```
users (Drizzle)
  └─> subscriptions (Supabase)
       ├─> subscription_plans
       │    ├─> subscription_plan_features
       │    │    └─> subscription_features
       │    │         └─> subscription_feature_categories
       │    └─> subscription_plan_prices
       └─> subscription_usage_tracking
            ├─> subscription_features
            └─> subscription_usage_events
```

### Feature Value Types Explained

1. **`boolean`** - Simple yes/no
   - Example: `ai_helper_chat_access` (user either has access or doesn't)
   - Limit fields: None used

2. **`count`** - Numeric limits
   - Example: `mentor_sessions_monthly` (max 5 sessions per month)
   - Limit fields: `limit_count`, `limit_interval`, `limit_interval_count`

3. **`minutes`** - Time-based limits
   - Example: `session_duration_minutes` (max 60 minutes per session)
   - Limit fields: `limit_minutes`, `limit_interval`

4. **`text`** - Display text
   - Example: `create_post_content` ("Unlimited" or "Limited")
   - Limit fields: `limit_text`

5. **`amount`** - Monetary/numeric
   - Example: `course_discount_percent` (20% discount)
   - Limit fields: `limit_amount`, `limit_currency`

6. **`percent`** - Percentage
   - Example: `partner_discounts` (15% off partner services)
   - Limit fields: `limit_percent`

7. **`json`** - Complex custom structures
   - Example: Team settings, custom configurations
   - Limit fields: `limit_json`

### Usage Tracking Flow

**When a user consumes a feature:**

1. **Check Access:**
   ```typescript
   const access = await checkFeatureAccess(userId, 'feature_key');
   if (!access.has_access) throw new Error(access.reason);
   ```

2. **Perform Action:**
   ```typescript
   // Create booking, send message, etc.
   const resource = await createResource();
   ```

3. **Track Usage:**
   ```typescript
   await trackFeatureUsage(
     userId,
     'feature_key',
     { count: 1, minutes: 30 },
     'resource_type',
     resource.id
   );
   ```

**Database Changes:**

1. **`subscription_usage_tracking` updated:**
   - Finds existing record for current period
   - Increments `usage_count` or `usage_minutes` or `usage_amount`
   - Creates new record if period doesn't exist

2. **`subscription_usage_events` inserted:**
   - Logs: user_id, feature_id, deltas, resource_type, resource_id
   - Provides complete audit trail

### Period Management

**Billing Periods:**
- `day`: Resets at midnight (00:00:00)
- `week`: Resets at start of week (Monday 00:00:00)
- `month`: Resets at start of month (1st at 00:00:00)
- `year`: Resets at start of year (Jan 1 at 00:00:00)

**Period Calculation:**
```typescript
// Example: Monthly period
period_start = '2026-01-01 00:00:00'
period_end = '2026-02-01 00:00:00'
interval_type = 'month'
interval_count = 1
```

**Reset Logic:**
- Periods do NOT auto-reset (requires background job)
- Usage checks compare `NOW()` against `period_end`
- If `NOW() > period_end`, new period should be created

---

## 5. UNDERSTANDING THE ENFORCEMENT SYSTEM

### How Subscription Checks Work

**Step-by-Step Flow:**

1. **User makes request** (e.g., POST /api/bookings)

2. **API route calls `checkFeatureAccess()`:**
   ```typescript
   const access = await checkFeatureAccess(userId, 'mentor_sessions_monthly');
   ```

3. **Enforcement system:**
   - Queries `subscriptions` table for user's active subscription
   - Throws error if no subscription found
   - Queries `subscription_plans` to get plan details
   - Queries `subscription_plan_features` to get feature assignment
   - If feature not included → returns `has_access: false`

4. **If metered feature:**
   - Queries `subscription_usage_tracking` for current period
   - Compares usage against limit
   - Returns remaining quota

5. **API route checks result:**
   ```typescript
   if (!access.has_access) {
     return NextResponse.json({ error: access.reason }, { status: 403 });
   }
   ```

6. **After successful operation:**
   ```typescript
   await trackFeatureUsage(userId, 'feature_key', { count: 1 });
   ```

7. **Tracking system:**
   - Updates `subscription_usage_tracking` (increment counters)
   - Inserts `subscription_usage_events` (audit log)

### Error Response Format

**Standard error response:**
```json
{
  "success": false,
  "error": "Session limit reached",
  "details": "Feature 'mentor_sessions_monthly' not included in your plan",
  "limit": 5,
  "usage": 5,
  "remaining": 0,
  "upgrade_required": true
}
```

**HTTP Status Codes:**
- `401`: Not authenticated
- `403`: Subscription limit reached or feature not included
- `500`: Subscription system error

### Setting app.current_user_id

**RLS policies use this context variable:**

In API routes, before Supabase queries:
```typescript
const { data, error } = await supabase.rpc('set_config', {
  setting: 'app.current_user_id',
  value: userId
});
```

However, with service role key, RLS policies may not apply. The helper functions (`is_admin`, `has_subscription_access`) check this explicitly.

---

## 6. CURRENT STATE: WHAT WORKS NOW

### ✅ Fully Functional

1. **Database Schema**
   - All tables created
   - All indexes created
   - All RLS policies active
   - All enums extended
   - All triggers working

2. **Core Enforcement**
   - Mentor session limits enforced on booking and session creation
   - Mentee session limits enforced by session type (free/paid/counseling)
   - Session duration limits enforced for mentees (per session type) and mentors
   - Message sending checks work
   - AI chat checks work
   - Usage tracking works for sessions, messaging, and AI messages
   - Message requests enforced
   - Course enrollments enforced
   - Recording access enforced

3. **Admin UI**
   - Can view all plans
   - Can view all features
   - Can create new plans
   - Can assign features + limits to plans
   - Can change plan status
   - Dashboard accessible

4. **Admin APIs**
   - Stats endpoint works
   - Plans list/create works
   - Plan update/delete works
   - Plan-feature assignment endpoints work
   - Features list works

5. **User Subscription Experience (Partial)**
   - Subscription tab displays current plan + usage
   - Lists all plans for the user's audience
   - Temporary "Select Plan" flow creates a subscription (bypasses checkout)

### Implementation Status by Feature (API Enforcement)

**Implemented (Enforced + Tracked)**
- Mentor session limits: `mentor_sessions_monthly` in `app/api/bookings/route.ts` and `app/api/sessions/route.ts`
- Mentee session limits by type: `free_video_sessions_monthly`, `paid_video_sessions_monthly`, `counseling_sessions_monthly` in `app/api/bookings/route.ts` and `app/api/sessions/route.ts`
- Session duration limits: `session_duration_minutes` in `app/api/bookings/route.ts` and `app/api/sessions/route.ts`
- Direct messages: `direct_messages_daily` in `app/api/messaging/threads/[id]/messages/route.ts`
- Message requests: `message_requests_daily` in `app/api/messaging/requests/route.ts`
- AI chat access + messages: `ai_helper_chat_access` and `ai_helper_messages_limit` in `app/api/chat/route.ts` and `app/api/ai-chatbot-messages/route.ts`
- Course enrollments: `free_courses_limit` in `app/api/courses/[id]/enroll/route.ts`
- Course access/discount at enroll: `courses_access`, `course_discount_percent` in `app/api/courses/[id]/enroll/route.ts`
- Recordings access: `session_recordings_access` in `app/api/sessions/[sessionId]/recordings/route.ts` and `app/api/recordings/[id]/playback-url/route.ts`
- Mentor AI appearance + mentee AI search (only when `?ai=true`): `ai_profile_appearances_monthly`, `ai_search_sessions_monthly` in `app/api/public-mentors/route.ts`

**Partially Implemented (Gated, but not fully scoped/leveled)**
- Analytics access: `analytics_access_level` is checked in `app/api/analytics/mentor/route.ts` and `app/api/student/learning-analytics/route.ts` but does not differentiate "Real-time" vs "Deep"
- Course access in listings: no pricing/discount visibility in `app/api/courses/route.ts`

**Not Implemented (No API gates yet)**
- Knowledge hub access: `knowledge_hub_access_level`
- Industry expert access/listing: `industry_expert_access_level`, `industry_expert_listing_limit`
- Live sessions: `live_sessions_minutes_monthly`, `live_sessions_count_monthly`
- Partner offers: `exclusive_partner_offers_access`
- Early access: `early_access_features`
- Team members: `team_member_limit` and `subscription_team_members` enforcement

### Where To Add Remaining Gates (Suggested Endpoints)

| Feature | Suggested endpoint(s) | Notes |
|---|---|---|
| Knowledge hub access | `app/api/courses/route.ts`, `app/api/student/courses/route.ts` | Gate list/browse and enrolled content; use `knowledge_hub_access_level` for limited vs unlimited. |
| Industry expert access | `app/api/public-mentors/route.ts`, `app/api/mentors/[id]/route.ts` | Use `industry_expert_access_level` to gate visibility or booking CTA. |
| Industry expert listing limit | `app/api/mentors/update-profile/route.ts`, `app/api/mentors/route.ts` | Enforce max categories/tags on mentor profile updates. |
| Live sessions | (When implemented) `app/api/live-sessions/*` | Use minutes/count limits per plan. |
| Partner offers | (UI/API depends on offers module) | Gate offers list or redemption endpoint. |
| Early access features | (Feature flag entry points) | Gate entry to beta features or routes. |
| Team member limit | `app/api/subscriptions/team/*` (to be created) | Enforce `team_member_limit` on invites/accepts. |

### ⚠️ Partially Functional

1. **Admin UI**
   - Cannot create/edit features (no UI)
   - Cannot view usage analytics (placeholder)
   - Cannot view active subscriptions (placeholder)

2. **Enforcement**
   - Legacy messaging API not enforced
   - Analytics access not enforced

3. **User Experience**
   - No upgrade prompts in UI
   - Error handling for limit reached is not wired to frontend

### ❌ Not Functional

1. **Payment Integration**
   - No Stripe integration
   - No checkout flow
   - No webhook handling
   - No subscription creation from payments

2. **User Management**
   - Users can't upgrade/downgrade via payments
   - Users can view their subscription + usage (UI complete)
   - Users can't manage team members

3. **Automation**
   - No usage reset job
   - No period rollover
   - No trial end handling
   - No payment retry logic

4. **Advanced Features**
   - No team member invitations
   - No team usage aggregation
   - No feature flags
   - No A/B testing

---

## 7. REMAINING WORK: COMPLETE TASK LIST

### Priority 1: Critical (Blocks Monetization)

**Estimated Time: 20 hours**

1. **Feature Assignment UI (8 hours)**
   - ✅ Completed

2. **User Subscription Display (6 hours)**
   - ✅ Completed (includes usage meters + plan list)

3. **Stripe Integration (6 hours)**
   - Checkout session creation
   - Webhook handling
   - Subscription lifecycle management
   - See [Phase 4: Task 1](#task-1-stripe-setup-configuration-2-hours)

### Priority 2: High (Improves UX)

**Estimated Time: 16 hours**

4. **Usage Analytics Dashboard (6 hours)**
   - Charts for feature usage
   - User metrics
   - Limit breach alerts
   - See [Phase 2: Task 2](#task-2-usage-analytics-dashboard-6-hours)

5. **Upgrade Flow (4 hours)**
   - Plan comparison page
   - Upgrade/downgrade buttons
   - Proration calculations
   - Checkout integration (Stripe)
   - See [Phase 3: Task 2](#task-2-plan-selection--upgrade-flow-5-hours)

6. **Error Handling & Prompts (3 hours)**
   - Upgrade modals on limit reached
   - Usage warning notifications
   - Better error messages
   - See [Phase 3: Task 3](#task-3-usage-notifications--upgrade-prompts-3-hours)

7. **Feature Creation UI (3 hours)**
   - Create/edit features
   - Category assignment
   - Metered flag management
   - See [Phase 2: Task 3](#task-3-feature-creation-interface-3-hours)

### Priority 3: Medium (Completeness)

**Estimated Time: 12 hours**

8. **Additional Enforcement (6 hours)**
   - Legacy messaging API
   - Analytics access
   - See [Section 7.3](#73-additional-feature-enforcement)

9. **Usage Reset Automation (3 hours)**
   - Background job to reset periods
   - Cron job setup
   - Email notifications
   - See [Section 7.4](#74-usage-reset-automation)

10. **Team Subscriptions (3 hours)**
    - Team member management UI
    - Invitation flow
    - Shared usage tracking
    - See [Section 7.5](#75-team-subscriptions)

### Priority 4: Low (Nice-to-Have)

**Estimated Time: 12 hours**

11. **Testing Suite (4 hours)**
    - Unit tests for enforcement
    - Integration tests for flows
    - E2E tests
    - See [Section 11](#11-testing--validation)

12. **Admin Features (4 hours)**
    - Bulk plan operations
    - Plan templates
    - Feature flags
    - See [Section 7.6](#76-advanced-admin-features)

13. **Performance Optimization (4 hours)**
    - Caching subscription data
    - Query optimization
    - Index tuning
    - See [Section 7.7](#77-performance-optimization)

### Total Remaining Time Estimate

- **Priority 1 (Critical):** 20 hours
- **Priority 2 (High):** 16 hours
- **Priority 3 (Medium):** 12 hours
- **Priority 4 (Low):** 12 hours
- **Total:** **60 hours** (~1.5 weeks for one developer)

---

## 8. PHASE 2: ADMIN UI COMPLETION

### Task 1: Feature Assignment Interface (8 hours)

**Goal:** Allow admins to assign features to plans and set limits

**File to Create:** `components/admin/dashboard/subscriptions/plan-feature-editor.tsx`

**Requirements:**

1. **Feature List View**
   - Display all features from `subscription_features` table
   - Group by category
   - Search/filter functionality
   - Show: name, feature_key, value_type, is_metered

2. **Feature Assignment**
   - Checkbox or toggle to include/exclude feature
   - Save to `subscription_plan_features.is_included`

3. **Limit Configuration**
   - Dynamic form based on `value_type`:
     - **boolean:** No limits needed
     - **count:** Number input for `limit_count`
     - **minutes:** Number input for `limit_minutes`
     - **text:** Text input for `limit_text`
     - **amount:** Number + currency for `limit_amount`/`limit_currency`
     - **percent:** Number input (0-100) for `limit_percent`
     - **json:** JSON editor for `limit_json`

4. **Interval Configuration**
   - Dropdown: day, week, month, year
   - Number input for interval_count
   - Only show if metered feature

5. **Save Functionality**
   - Button to save all changes
   - Optimistic UI updates
   - Error handling

**API Endpoints Needed:**

**GET `/api/admin/subscriptions/plans/[planId]/features`**

```typescript
// app/api/admin/subscriptions/plans/[planId]/features/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();

    // Get all features with their assignment status for this plan
    const { data: allFeatures } = await supabase
      .from('subscription_features')
      .select(`
        *,
        subscription_feature_categories(name, icon),
        subscription_plan_features!left(
          id,
          is_included,
          limit_count,
          limit_minutes,
          limit_text,
          limit_amount,
          limit_currency,
          limit_percent,
          limit_json,
          limit_interval,
          limit_interval_count
        )
      `)
      .eq('subscription_plan_features.plan_id', planId);

    return NextResponse.json({ success: true, data: allFeatures });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load features' },
      { status: 500 }
    );
  }
}
```

**POST `/api/admin/subscriptions/plans/[planId]/features`**

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const { feature_id, limits } = body;

    const supabase = await createClient();

    // Upsert feature assignment
    const { data, error } = await supabase
      .from('subscription_plan_features')
      .upsert({
        plan_id: planId,
        feature_id,
        ...limits
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save feature' },
      { status: 500 }
    );
  }
}
```

**Component Structure:**

```typescript
// components/admin/dashboard/subscriptions/plan-feature-editor.tsx

interface PlanFeatureEditorProps {
  planId: string;
  onClose: () => void;
}

export function PlanFeatureEditor({ planId, onClose }: PlanFeatureEditorProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [limits, setLimits] = useState<Limits>({});

  // Load features
  useEffect(() => {
    fetch(`/api/admin/subscriptions/plans/${planId}/features`)
      .then(res => res.json())
      .then(data => setFeatures(data.data));
  }, [planId]);

  // Save feature assignment
  const saveFeature = async (featureId: string) => {
    await fetch(`/api/admin/subscriptions/plans/${planId}/features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_id: featureId, limits })
    });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: Feature List */}
      <div>
        <Input placeholder="Search features..." />
        {features.map(feature => (
          <FeatureRow
            key={feature.id}
            feature={feature}
            onSelect={setSelectedFeature}
          />
        ))}
      </div>

      {/* Right: Limit Configuration */}
      <div>
        {selectedFeature && (
          <LimitConfigForm
            feature={selectedFeature}
            limits={limits}
            onChange={setLimits}
            onSave={() => saveFeature(selectedFeature.id)}
          />
        )}
      </div>
    </div>
  );
}
```

**LimitConfigForm Component:**

```typescript
function LimitConfigForm({ feature, limits, onChange, onSave }) {
  switch (feature.value_type) {
    case 'boolean':
      return (
        <div>
          <Label>Include Feature</Label>
          <Switch
            checked={limits.is_included}
            onCheckedChange={(checked) => onChange({ ...limits, is_included: checked })}
          />
        </div>
      );

    case 'count':
      return (
        <div>
          <Label>Limit Count</Label>
          <Input
            type="number"
            value={limits.limit_count || ''}
            onChange={(e) => onChange({ ...limits, limit_count: parseInt(e.target.value) })}
          />
          <Label>Interval</Label>
          <Select
            value={limits.limit_interval}
            onValueChange={(value) => onChange({ ...limits, limit_interval: value })}
          >
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </Select>
        </div>
      );

    // ... other cases
  }
}
```

---

### Task 2: Usage Analytics Dashboard (6 hours)

**Goal:** Show usage metrics and trends for all subscriptions

**File to Enhance:** `components/admin/dashboard/subscriptions/usage-analytics.tsx`

**Requirements:**

1. **Feature Usage Charts**
   - Bar chart: Most used features
   - Line chart: Usage trends over time (last 30 days)
   - Table: Users at or near limits

2. **User Metrics**
   - Total active subscriptions by plan
   - New subscriptions this month
   - Canceled subscriptions
   - Churn rate

3. **Revenue Metrics**
   - MRR (Monthly Recurring Revenue)
   - ARR (Annual Recurring Revenue)
   - Revenue by plan breakdown
   - Average revenue per user (ARPU)

**API Endpoints Needed:**

**GET `/api/admin/subscriptions/analytics/usage`**

```typescript
// app/api/admin/subscriptions/analytics/usage/route.ts

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Top features by usage
  const { data: topFeatures } = await supabase
    .from('subscription_usage_events')
    .select(`
      feature_id,
      subscription_features(name),
      count:count_delta
    `)
    .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());

  // Users at limit
  const { data: atLimit } = await supabase
    .from('subscription_usage_tracking')
    .select(`
      subscription_id,
      feature_id,
      usage_count,
      limit_reached,
      subscriptions(user_id)
    `)
    .eq('limit_reached', true);

  return NextResponse.json({
    success: true,
    data: { topFeatures, atLimit }
  });
}
```

**GET `/api/admin/subscriptions/analytics/revenue`**

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Calculate MRR
  const { data: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select(`
      quantity,
      subscription_plan_prices(amount, billing_interval)
    `)
    .in('status', ['active', 'trialing']);

  let mrr = 0;
  activeSubscriptions?.forEach(sub => {
    const price = sub.subscription_plan_prices;
    if (price.billing_interval === 'month') {
      mrr += price.amount * sub.quantity;
    } else if (price.billing_interval === 'year') {
      mrr += (price.amount / 12) * sub.quantity;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      mrr,
      arr: mrr * 12,
      activeSubscriptions: activeSubscriptions?.length || 0
    }
  });
}
```

**Component Implementation:**

```typescript
import { Card } from '@/components/ui/card';
import { BarChart, LineChart } from 'recharts'; // or your charting library

export function UsageAnalyticsFull() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/subscriptions/analytics/usage').then(r => r.json()),
      fetch('/api/admin/subscriptions/analytics/revenue').then(r => r.json())
    ]).then(([usage, revenue]) => {
      setMetrics({ usage: usage.data, revenue: revenue.data });
    });
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <h3>MRR</h3>
          <p>${metrics.revenue.mrr.toLocaleString()}</p>
        </Card>
        <Card>
          <h3>ARR</h3>
          <p>${metrics.revenue.arr.toLocaleString()}</p>
        </Card>
        <Card>
          <h3>Active Subs</h3>
          <p>{metrics.revenue.activeSubscriptions}</p>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <h3>Top Features by Usage</h3>
        <BarChart data={metrics.usage.topFeatures} />
      </Card>

      {/* Users at Limit */}
      <Card>
        <h3>Users at Limit</h3>
        <table>
          {metrics.usage.atLimit.map(user => (
            <tr key={user.subscription_id}>
              <td>{user.subscriptions.user_id}</td>
              <td>{user.subscription_features.name}</td>
              <td>{user.usage_count}</td>
            </tr>
          ))}
        </table>
      </Card>
    </div>
  );
}
```

---

### Task 3: Feature Creation Interface (3 hours)

**Goal:** Allow admins to create/edit features dynamically

**File to Enhance:** `components/admin/dashboard/subscriptions/features-management.tsx`

**Requirements:**

1. **Create Feature Dialog**
   - Form fields: name, feature_key, description, category, value_type, unit, is_metered
   - Validation: feature_key must be unique and lowercase_snake_case
   - Submit to API

2. **Edit Feature Dialog**
   - Load existing feature data
   - Update all fields except feature_key (immutable)
   - Submit to API

3. **Archive Feature**
   - Soft delete (set `is_active = false` if you add that column)
   - Or hard delete if no subscriptions use it

**API Endpoints Needed:**

**POST `/api/admin/subscriptions/features`**

```typescript
// app/api/admin/subscriptions/features/route.ts

import { z } from 'zod';

const createFeatureSchema = z.object({
  feature_key: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Must be lowercase with underscores'),
  name: z.string().min(1),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  value_type: z.enum(['boolean', 'count', 'minutes', 'text', 'amount', 'percent', 'json']),
  unit: z.string().optional(),
  is_metered: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createFeatureSchema.parse(body);

    const supabase = await createClient();

    // Check if feature_key already exists
    const { data: existing } = await supabase
      .from('subscription_features')
      .select('id')
      .eq('feature_key', validated.feature_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Feature key already exists' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('subscription_features')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create feature' },
      { status: 500 }
    );
  }
}
```

**PATCH `/api/admin/subscriptions/features/[featureId]`**

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const body = await request.json();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subscription_features')
      .update(body)
      .eq('id', featureId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update feature' },
      { status: 500 }
    );
  }
}
```

**Component Implementation:**

```typescript
function CreateFeatureDialog({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    feature_key: '',
    name: '',
    description: '',
    category_id: '',
    value_type: 'boolean',
    unit: '',
    is_metered: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/admin/subscriptions/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (data.success) {
      toast.success('Feature created');
      onSuccess();
      onClose();
    } else {
      toast.error(data.error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Feature</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Feature Key *</Label>
              <Input
                placeholder="e.g., ai_helper_chat_access"
                value={formData.feature_key}
                onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase with underscores only
              </p>
            </div>

            <div>
              <Label>Display Name *</Label>
              <Input
                placeholder="e.g., AI Helper Chat Access"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What does this feature do?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {/* Load categories from API */}
                  <SelectItem value="category-id">Sessions & Meetings</SelectItem>
                  <SelectItem value="category-id">AI Features</SelectItem>
                  {/* etc */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Value Type *</Label>
              <Select
                value={formData.value_type}
                onValueChange={(value) => setFormData({ ...formData, value_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                  <SelectItem value="count">Count (Numeric limit)</SelectItem>
                  <SelectItem value="minutes">Minutes (Time limit)</SelectItem>
                  <SelectItem value="text">Text (Display text)</SelectItem>
                  <SelectItem value="amount">Amount (Money/numeric)</SelectItem>
                  <SelectItem value="percent">Percent (Percentage)</SelectItem>
                  <SelectItem value="json">JSON (Complex data)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['count', 'minutes'].includes(formData.value_type) && (
              <div>
                <Label>Unit</Label>
                <Input
                  placeholder="e.g., sessions, messages, GB"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_metered}
                onCheckedChange={(checked) => setFormData({ ...formData, is_metered: checked })}
              />
              <Label>Is Metered (track usage)</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Feature
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 9. PHASE 3: USER-FACING UI

### Task 1: Subscription Display for Users (6 hours)

**Goal:** Users can see their current plan, features, and usage

**Files to Create:**
- `components/mentee/dashboard/mentee-subscription.tsx`
- `components/mentor/dashboard/mentor-subscription.tsx`
- `components/shared/subscription/plan-card.tsx`
- `components/shared/subscription/usage-meter.tsx`

**Requirements:**

1. **Plan Overview Card**
   - Display: Plan name, price, billing interval
   - Show: Days remaining in current period
   - Buttons: Upgrade, Cancel

2. **Included Features List**
   - Grouped by category
   - Show limits for each feature
   - Icons and descriptions

3. **Usage Meters**
   - For metered features only
   - Progress bar showing usage vs limit
   - Color coding: green (< 70%), yellow (70-90%), red (> 90%)
   - Text: "5 of 10 sessions used this month"

4. **Upgrade CTA**
   - "Upgrade to Pro" button
   - Links to pricing page

**API Endpoints Needed:**

**GET `/api/subscriptions/me`**

```typescript
// app/api/subscriptions/me/route.ts

import { auth } from '@/lib/auth';
import { getUserSubscription, getPlanFeatures } from '@/lib/subscriptions/enforcement';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(session.user.id);
    const features = await getPlanFeatures(session.user.id);

    return NextResponse.json({
      success: true,
      data: { subscription, features }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**GET `/api/subscriptions/me/usage`**

```typescript
// app/api/subscriptions/me/usage/route.ts

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    const subscription = await getUserSubscription(userId);
    const supabase = await createClient();

    // Get usage for all metered features
    const { data: usage } = await supabase
      .from('subscription_usage_tracking')
      .select(`
        *,
        subscription_features(feature_key, name, value_type, unit)
      `)
      .eq('subscription_id', subscription.subscription_id);

    return NextResponse.json({ success: true, data: usage });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**Component Implementation:**

```typescript
// components/shared/subscription/subscription-display.tsx

export function SubscriptionDisplay() {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions/me').then(r => r.json()),
      fetch('/api/subscriptions/me/usage').then(r => r.json())
    ]).then(([subData, usageData]) => {
      setSubscription(subData.data);
      setUsage(usageData.data);
    });
  }, []);

  if (!subscription) return <div>Loading...</div>;

  const daysRemaining = Math.ceil(
    (new Date(subscription.subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{subscription.subscription.plan_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {daysRemaining} days remaining in billing period
              </p>
            </div>
            <Badge>{subscription.subscription.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button>Upgrade Plan</Button>
          <Button variant="outline">Cancel Subscription</Button>
        </CardContent>
      </Card>

      {/* Usage Meters */}
      <Card>
        <CardHeader>
          <CardTitle>Your Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage.filter(u => u.subscription_features.is_metered).map(u => (
            <UsageMeter
              key={u.id}
              name={u.subscription_features.name}
              usage={u.usage_count}
              limit={u.limit_count}
              unit={u.subscription_features.unit}
            />
          ))}
        </CardContent>
      </Card>

      {/* Included Features */}
      <Card>
        <CardHeader>
          <CardTitle>Included Features</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription.features.map(feature => (
            <div key={feature.feature_key} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>{feature.feature_name}</span>
              {feature.limit_count && (
                <span className="text-sm text-muted-foreground">
                  (up to {feature.limit_count} {feature.unit})
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

**UsageMeter Component:**

```typescript
function UsageMeter({ name, usage, limit, unit }) {
  const percent = limit ? (usage / limit) * 100 : 0;

  const color = percent < 70 ? 'bg-green-500' :
                percent < 90 ? 'bg-yellow-500' :
                'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{name}</span>
        <span>{usage} of {limit} {unit}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {percent >= 90 && (
        <p className="text-xs text-red-500 mt-1">
          You're approaching your limit. Consider upgrading.
        </p>
      )}
    </div>
  );
}
```

**Integration:**

Add to sidebar navigation:
```typescript
// components/mentee/sidebars/user-sidebar.tsx

const items = [
  { key: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  // ... other items
  { key: "subscription", title: "Subscription", icon: CreditCard },
];
```

Add to dashboard routing:
```typescript
// components/dashboard/dashboard-shell.tsx

case "subscription":
  return <SubscriptionDisplay />;
```

---

### Task 2: Plan Selection & Upgrade Flow (5 hours)

**Goal:** Users can compare plans and upgrade/downgrade

**Files to Create:**
- `components/shared/subscription/plan-selector.tsx`
- `components/shared/subscription/plan-comparison.tsx`
- `app/(public)/pricing/page.tsx`

**Requirements:**

1. **Public Pricing Page**
   - Display all active plans
   - Filter by audience (mentor/mentee)
   - Feature comparison table
   - "Sign Up" or "Get Started" buttons

2. **Authenticated Upgrade Flow**
   - Highlight current plan
   - Show upgrade options only
   - Calculate prorated amounts
   - Confirm upgrade button

3. **Plan Comparison Table**
   - Side-by-side comparison
   - Checkmarks for included features
   - Limits displayed clearly
   - Highlight differences

**API Endpoints Needed:**

**GET `/api/subscriptions/plans/public`**

```typescript
// app/api/subscriptions/plans/public/route.ts

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get('audience'); // 'mentor' or 'mentee'

  let query = supabase
    .from('subscription_plans')
    .select(`
      *,
      subscription_plan_features(
        *,
        subscription_features(*)
      ),
      subscription_plan_prices(*)
    `)
    .eq('status', 'active')
    .order('sort_order');

  if (audience) {
    query = query.eq('audience', audience);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({ success: true, data });
}
```

**Component Implementation:**

```typescript
// app/(public)/pricing/page.tsx

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [audience, setAudience] = useState('mentee');

  useEffect(() => {
    fetch(`/api/subscriptions/plans/public?audience=${audience}`)
      .then(r => r.json())
      .then(data => setPlans(data.data));
  }, [audience]);

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">
        Choose Your Plan
      </h1>

      {/* Audience Toggle */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant={audience === 'mentee' ? 'default' : 'outline'}
          onClick={() => setAudience('mentee')}
        >
          For Mentees
        </Button>
        <Button
          variant={audience === 'mentor' ? 'default' : 'outline'}
          onClick={() => setAudience('mentor')}
        >
          For Mentors
        </Button>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-8">Feature Comparison</h2>
        <PlanComparisonTable plans={plans} />
      </div>
    </div>
  );
}
```

**PlanCard Component:**

```typescript
function PlanCard({ plan }) {
  const monthlyPrice = plan.subscription_plan_prices.find(
    p => p.billing_interval === 'month'
  );

  return (
    <Card className={plan.plan_key === 'pro' ? 'border-blue-500 border-2' : ''}>
      {plan.plan_key === 'pro' && (
        <Badge className="absolute top-4 right-4">Most Popular</Badge>
      )}
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <div className="text-3xl font-bold">
          ${monthlyPrice?.amount || 0}
          <span className="text-sm font-normal text-muted-foreground">/month</span>
        </div>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {plan.subscription_plan_features.map(pf => (
            <li key={pf.id} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <span className="text-sm">
                {pf.subscription_features.name}
                {pf.limit_count && ` (${pf.limit_count} ${pf.subscription_features.unit})`}
              </span>
            </li>
          ))}
        </ul>
        <Button className="w-full mt-6">
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}
```

**PlanComparisonTable Component:**

```typescript
function PlanComparisonTable({ plans }) {
  // Get all unique features
  const allFeatures = [...new Set(
    plans.flatMap(p =>
      p.subscription_plan_features.map(f => ({
        key: f.subscription_features.feature_key,
        name: f.subscription_features.name
      }))
    )
  )];

  return (
    <table className="w-full border">
      <thead>
        <tr>
          <th className="p-4 text-left">Feature</th>
          {plans.map(plan => (
            <th key={plan.id} className="p-4 text-center">
              {plan.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {allFeatures.map(feature => (
          <tr key={feature.key} className="border-t">
            <td className="p-4">{feature.name}</td>
            {plans.map(plan => {
              const planFeature = plan.subscription_plan_features.find(
                pf => pf.subscription_features.feature_key === feature.key
              );
              return (
                <td key={plan.id} className="p-4 text-center">
                  {planFeature?.is_included ? (
                    <div>
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                      {planFeature.limit_count && (
                        <span className="text-xs text-muted-foreground">
                          {planFeature.limit_count} {planFeature.subscription_features.unit}
                        </span>
                      )}
                    </div>
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### Task 3: Usage Notifications & Upgrade Prompts (3 hours)

**Goal:** Show users when they're near or at limits

**Files to Create:**
- `components/shared/subscription/limit-reached-modal.tsx`
- `components/shared/subscription/usage-warning-banner.tsx`

**Requirements:**

1. **Limit Reached Modal**
   - Triggered by 403 response from API
   - Show: Feature name, current limit, usage
   - CTA: "Upgrade to Pro" button
   - Allow dismissal

2. **Usage Warning Banner**
   - Show at 80% usage
   - Sticky at top of dashboard
   - Dismissible (remember dismissal in localStorage)

3. **Error Toasts**
   - Show toast on limit reached
   - Link to upgrade page

**Component Implementation:**

```typescript
// components/shared/subscription/limit-reached-modal.tsx

interface LimitReachedModalProps {
  error: {
    error: string;
    feature: string;
    limit: number;
    usage: number;
    remaining: number;
  };
  onClose: () => void;
}

export function LimitReachedModal({ error, onClose }: LimitReachedModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limit Reached</DialogTitle>
          <DialogDescription>
            You've used all {error.limit} of your {error.feature} this period.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span>Usage</span>
            <span className="font-semibold">{error.usage} / {error.limit}</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        <p className="text-sm text-muted-foreground">
          Upgrade your plan to get more {error.feature} and unlock additional features.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
          <Button onClick={() => window.location.href = '/pricing'}>
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Usage Warning Banner:**

```typescript
// components/shared/subscription/usage-warning-banner.tsx

export function UsageWarningBanner() {
  const [usage, setUsage] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/subscriptions/me/usage')
      .then(r => r.json())
      .then(data => setUsage(data.data));
  }, []);

  // Check if any feature is at 80%+
  const nearLimit = usage.find(u => {
    const percent = (u.usage_count / u.limit_count) * 100;
    return percent >= 80 && percent < 100;
  });

  if (!nearLimit || dismissed) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            You're using {nearLimit.usage_count} of {nearLimit.limit_count} {nearLimit.subscription_features.name}.
            Upgrade your plan to avoid interruptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => window.location.href = '/pricing'}>
            Upgrade
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Integration with API Error Handling:**

```typescript
// In your API client or fetch wrapper

async function apiCall(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (response.status === 403 && data.upgrade_required) {
    // Show limit reached modal
    showLimitReachedModal(data);
    throw new Error(data.error);
  }

  return data;
}
```

---

## 10. PHASE 4: PAYMENT INTEGRATION

### Task 1: Stripe Setup & Configuration (2 hours)

**Goal:** Configure Stripe for subscription payments

**Environment Variables Needed:**

Add to `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Stripe Dashboard Setup:**

1. **Create Products:**
   - One product per subscription plan
   - Add metadata: `plan_id` (from your database)

2. **Create Prices:**
   - Monthly and yearly prices for each product
   - Add metadata: `price_id` (from your `subscription_plan_prices` table)

3. **Configure Webhook:**
   - Endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events to subscribe:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

**Files to Create:**

1. **`lib/payments/stripe-client.ts`**

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});
```

---

### Task 2: Checkout Session Creation (3 hours)

**Goal:** Users can start checkout to subscribe

**API Route:**

```typescript
// app/api/stripe/create-checkout-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/payments/stripe-client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, priceId } = await request.json();
    const supabase = await createClient();

    // Get plan and price details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    const { data: price } = await supabase
      .from('subscription_plan_prices')
      .select('*')
      .eq('id', priceId)
      .single();

    if (!plan || !price) {
      return NextResponse.json({ error: 'Invalid plan or price' }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId = session.user.stripe_customer_id; // Assume you add this field

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: {
          user_id: session.user.id
        }
      });
      customerId = customer.id;

      // Save customer ID (you'll need to add this column to users table)
      // await db.update(users).set({ stripe_customer_id: customerId })...
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.stripe_price_id, // You need to store this when creating prices
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: session.user.id,
        plan_id: planId,
        price_id: priceId
      }
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

**Frontend Integration:**

```typescript
// components/shared/subscription/plan-card.tsx

async function handleSubscribe(planId: string, priceId: string) {
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, priceId })
  });

  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe Checkout
}
```

---

### Task 3: Webhook Handler (4 hours)

**Goal:** Process Stripe events and update subscriptions

**API Route:**

```typescript
// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe-client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const priceId = session.metadata?.price_id;

        if (!userId || !planId || !priceId) {
          throw new Error('Missing metadata in checkout session');
        }

        // Create subscription in database
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_id: planId,
          price_id: priceId,
          status: 'active',
          provider: 'stripe',
          provider_customer_id: session.customer as string,
          provider_subscription_id: session.subscription as string,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString() // +30 days
        });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('provider_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            ended_at: new Date().toISOString()
          })
          .eq('provider_subscription_id', subscription.id);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Log payment, send receipt email, etc.
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle failed payment: notify user, mark subscription as past_due
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('provider_subscription_id', invoice.subscription as string);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

**Testing Webhooks Locally:**

Install Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Trigger test events:
```bash
stripe trigger checkout.session.completed
```

---

## 11. TESTING & VALIDATION

### Manual Testing Checklist

**Database Setup:**
1. [ ] Run migrations in Supabase
2. [ ] Verify all tables created
3. [ ] Check RLS policies enabled
4. [ ] Seed features and categories

**Create Test Subscription:**
```sql
-- In Supabase SQL editor

-- Get a user ID
SELECT id, email FROM auth.users LIMIT 1;

-- Get a plan ID
SELECT id, plan_key, name FROM subscription_plans WHERE audience = 'mentee' LIMIT 1;

-- Create subscription
INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
VALUES
('YOUR_USER_ID', 'PLAN_ID', 'active', NOW(), NOW() + INTERVAL '1 month');
```

**Assign Features to Plan:**
```sql
-- Get feature IDs
SELECT id, feature_key, name FROM subscription_features;

-- Assign features with limits
INSERT INTO subscription_plan_features (plan_id, feature_id, is_included, limit_count, limit_interval, limit_interval_count)
VALUES
('PLAN_ID', 'FEATURE_ID_1', true, 5, 'month', 1),  -- 5 sessions per month
('PLAN_ID', 'FEATURE_ID_2', true, 100, 'day', 1);  -- 100 messages per day
```

**Test Enforcement:**

1. **Session Booking:**
   - [ ] Try to book a session as authenticated user
   - [ ] Verify subscription check runs
   - [ ] Book sessions up to limit
   - [ ] Verify 403 error on limit +1
   - [ ] Check `subscription_usage_tracking` table updated
   - [ ] Check `subscription_usage_events` table has entries

2. **Messaging:**
   - [ ] Send messages up to daily limit
   - [ ] Verify 403 error on limit +1
   - [ ] Verify usage tracked

3. **AI Chat:**
   - [ ] Try unauthenticated → expect 401
   - [ ] Try authenticated without AI feature → expect 403
   - [ ] Send messages up to limit
   - [ ] Verify 403 on limit +1

**Test Admin UI:**
1. [ ] Navigate to `/dashboard?section=subscriptions` as admin
2. [ ] Verify stats display
3. [ ] View plans and features
4. [ ] Create new plan
5. [ ] Change plan status

**Test Error Responses:**
1. [ ] Verify error messages are user-friendly
2. [ ] Check error includes upgrade_required flag
3. [ ] Verify frontend handles 403 responses

---

## 12. DEPLOYMENT & ROLLOUT

### Pre-Deployment Checklist

**Environment Variables:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Database:**
1. [ ] All migrations applied to production Supabase
2. [ ] RLS policies enabled
3. [ ] Indexes created
4. [ ] Features seeded
5. [ ] Plans created and active

**Code:**
1. [ ] All enforcement code merged
2. [ ] Admin UI deployed
3. [ ] User-facing UI deployed
4. [ ] Webhook endpoint configured

**Stripe:**
1. [ ] Products created
2. [ ] Prices created
3. [ ] Webhook endpoint registered
4. [ ] Test mode vs live mode verified

### Rollout Strategy

**Phase 1: Soft Launch (Week 1)**
- Enable for internal team only
- Test all flows end-to-end
- Monitor error rates
- Fix critical bugs

**Phase 2: Beta (Week 2-3)**
- Enable for 10% of users (feature flag)
- Monitor usage patterns
- Collect user feedback
- Adjust limits based on data

**Phase 3: Full Launch (Week 4)**
- Enable for all users
- Marketing announcement
- Support team ready
- Monitor system health

### Monitoring

**Key Metrics to Track:**

1. **Subscription Checks:**
   - Rate of checks per minute
   - Success vs failure rate
   - Average latency

2. **Usage Tracking:**
   - Number of events logged
   - Tracking failures
   - Storage growth

3. **Business Metrics:**
   - New subscriptions
   - Upgrade rate
   - Churn rate
   - MRR growth

**Logging:**

Add to enforcement functions:
```typescript
console.log('[subscription-check]', {
  userId,
  featureKey,
  hasAccess: access.has_access,
  usage: access.usage,
  limit: access.limit
});
```

Set up alerts:
- Subscription check failure rate > 1%
- Usage tracking failure rate > 5%
- Webhook processing failures

---

## 13. TROUBLESHOOTING GUIDE

### Common Issues & Solutions

**Issue: "No active subscription found for user"**

**Cause:** User doesn't have a subscription in the database

**Solution:**
```sql
-- Check if user exists
SELECT id, email FROM auth.users WHERE id = 'USER_ID';

-- Check if subscription exists
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';

-- Create subscription
INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
VALUES ('USER_ID', 'PLAN_ID', 'active', NOW(), NOW() + INTERVAL '1 month');
```

---

**Issue: "Feature not included in your plan"**

**Cause:** Feature not assigned to plan or `is_included = false`

**Solution:**
```sql
-- Check if feature assigned
SELECT * FROM subscription_plan_features
WHERE plan_id = 'PLAN_ID' AND feature_id = 'FEATURE_ID';

-- Assign feature
INSERT INTO subscription_plan_features (plan_id, feature_id, is_included, limit_count)
VALUES ('PLAN_ID', 'FEATURE_ID', true, 10);
```

---

**Issue: Usage tracking not updating**

**Cause:** Error in `trackFeatureUsage()` function

**Debug:**
```typescript
// Add debug logging
console.log('Tracking usage:', {
  userId,
  featureKey,
  delta,
  resourceType,
  resourceId
});

try {
  await trackFeatureUsage(...);
} catch (error) {
  console.error('TRACKING FAILED:', error);
  // Check if feature exists
  // Check if subscription exists
  // Check if period exists
}
```

**Check database:**
```sql
-- Verify feature exists
SELECT * FROM subscription_features WHERE feature_key = 'feature_key';

-- Verify subscription exists
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';

-- Check usage records
SELECT * FROM subscription_usage_tracking
WHERE subscription_id = 'SUB_ID'
AND feature_id = 'FEATURE_ID';
```

---

**Issue: RLS policies blocking admin access**

**Cause:** `is_admin()` function not recognizing user as admin

**Solution:**
```sql
-- Check user roles
SELECT ur.*, r.name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'USER_ID';

-- Add admin role if missing
INSERT INTO user_roles (user_id, role_id)
SELECT 'USER_ID', id FROM roles WHERE name = 'admin';
```

---

**Issue: Webhook not processing**

**Cause:** Signature verification failing or missing metadata

**Debug:**
```typescript
console.log('Webhook event:', {
  type: event.type,
  id: event.id,
  metadata: event.data.object.metadata
});

// Check signature
if (!signature) {
  console.error('NO SIGNATURE HEADER');
}

// Check secret
console.log('Using webhook secret:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10));
```

**Test webhook locally:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

**Issue: Period not resetting**

**Cause:** No background job to reset periods

**Temporary Fix:**
```sql
-- Manually create new period for user
DELETE FROM subscription_usage_tracking
WHERE subscription_id = 'SUB_ID'
AND period_end < NOW();

-- New period will be created on next usage
```

**Permanent Solution:** Implement usage reset automation (see Section 7.4)

---

## 14. CODE EXAMPLES & PATTERNS

### Pattern 1: Adding Enforcement to New Endpoint

**Example: Enforce course enrollment limit**

```typescript
// app/api/courses/[courseId]/enroll/route.ts

import { enforceAndTrackFeature } from '@/lib/subscriptions/enforcement';

export async function POST(request: NextRequest, { params }) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;

  // 1. Check and track in one call
  try {
    await enforceAndTrackFeature(
      userId,
      'free_courses_limit',
      { count: 1 },
      'course_enrollment',
      courseId
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Course enrollment limit reached',
        details: error.message,
        upgrade_required: true
      },
      { status: 403 }
    );
  }

  // 2. Proceed with enrollment
  const enrollment = await db.insert(courseEnrollments).values({
    user_id: userId,
    course_id: courseId
  });

  return NextResponse.json({ success: true, data: enrollment });
}
```

---

### Pattern 2: Checking Boolean Feature Access

**Example: Check if user has analytics access**

```typescript
// components/mentor/dashboard/mentor-analytics-section.tsx

useEffect(() => {
  const checkAccess = async () => {
    const response = await fetch('/api/subscriptions/features/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'deep_analytics' })
    });

    const data = await response.json();

    if (!data.has_access) {
      setShowUpgradePrompt(true);
      return;
    }

    // Load analytics data
    loadAnalytics();
  };

  checkAccess();
}, []);

return (
  <div>
    {showUpgradePrompt ? (
      <UpgradePrompt feature="Deep Analytics" />
    ) : (
      <AnalyticsCharts data={analyticsData} />
    )}
  </div>
);
```

**API endpoint:**
```typescript
// app/api/subscriptions/features/check/route.ts

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const { feature } = await request.json();

  const access = await checkFeatureAccess(session.user.id, feature);

  return NextResponse.json(access);
}
```

---

### Pattern 3: Creating a New Feature

**Steps:**

1. **Add feature to database:**
```sql
INSERT INTO subscription_features (
  feature_key,
  name,
  description,
  value_type,
  unit,
  is_metered,
  category_id
) VALUES (
  'session_recordings_access',
  'Session Recordings',
  'Record and playback your mentoring sessions',
  'boolean',
  NULL,
  false,
  (SELECT id FROM subscription_feature_categories WHERE category_key = 'recordings')
);
```

2. **Assign to plans:**
```sql
INSERT INTO subscription_plan_features (plan_id, feature_id, is_included)
SELECT
  sp.id,
  sf.id,
  true
FROM subscription_plans sp
CROSS JOIN subscription_features sf
WHERE sp.plan_key IN ('pro', 'pro_plus', 'corporate')
AND sf.feature_key = 'session_recordings_access';
```

3. **Add enforcement in code:**
```typescript
// app/api/sessions/[sessionId]/livekit/create-room/route.ts

const recordingAccess = await checkFeatureAccess(userId, 'session_recordings_access');

const roomConfig = {
  name: roomName,
  maxParticipants: 2,
  recordingEnabled: recordingAccess.has_access  // Enable only if user has access
};

await LiveKitRoomManager.createRoom(roomConfig);
```

---

### Pattern 4: Handling Subscription Errors in Frontend

```typescript
// lib/api-client.ts

async function apiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();

  // Handle subscription errors
  if (response.status === 403 && data.upgrade_required) {
    // Show modal
    showLimitReachedModal({
      feature: data.feature || 'this feature',
      limit: data.limit,
      usage: data.usage,
      error: data.error
    });

    throw new SubscriptionLimitError(data.error);
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

class SubscriptionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionLimitError';
  }
}
```

---

## FINAL NOTES FOR THE DEVELOPER

### What You Need to Know

1. **This is Production-Grade Work**
   - Do not take shortcuts
   - Do not hardcode values
   - Do not skip error handling
   - Always test your changes

2. **The Foundation is Solid**
   - Database schema is complete
   - Enforcement utilities work
   - Core features are protected
   - RLS policies are secure

3. **Your Job is to Complete the Experience**
   - Build the remaining UI
   - Add payment integration
   - Test everything thoroughly
   - Deploy with confidence

### Where to Get Help

1. **Codebase References:**
   - Existing enforcement: `app/api/bookings/route.ts` (lines 55-86, 277-289)
   - Enforcement utilities: `lib/subscriptions/enforcement.ts`
   - Admin UI examples: `components/admin/dashboard/subscriptions/`

2. **Database Schema:**
   - Supabase Dashboard → SQL Editor
   - Run `SELECT * FROM subscription_plans` to see data
   - Check RLS policies in Table Editor → Policies

3. **Testing:**
   - Create test subscriptions via SQL
   - Use Postman/curl to test APIs
   - Check browser console for errors
   - Monitor Supabase logs

### Success Metrics

By the end of your work:
- [ ] Users cannot exceed limits
- [ ] Admins can create/edit plans dynamically
- [ ] Users see their usage and can upgrade
- [ ] System tracks all usage accurately
- [ ] Payments work end-to-end

### Questions to Ask

If anything is unclear:
1. What is the business requirement? (Ask product/stakeholders)
2. What is the technical constraint? (Review this doc and codebase)
3. What is the user experience goal? (Ask design/product)

### Final Checklist

Before marking this complete:
- [ ] All Priority 1 tasks done
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] RLS policies verified
- [ ] Admin can create plans
- [ ] Users can subscribe
- [ ] Usage tracking works
- [ ] Payment integration works
- [ ] Documentation updated
- [ ] Code reviewed

---

**Good luck! You've got this. The hard part is done - now finish strong.** 🚀

## Mentee Subscription Plan
**Mentee Registration:** FREE

| Feature / Plan | Introduction Plan<br>Free Trial for Everyone | Youth<br>Rs 1,999/month<br>Students* | Professionals<br>Rs 4,999/month<br>Working Individuals / Startups / Business Owners | Corporates<br>Rs 23,999/month<br>Max 5-member team |
|---------------|---------------------------------------------|--------------------------------------|--------------------------------------------------|--------------------------------|
| **Introductory Offer*** | FREE | ₹499/month | ₹999/month | ₹9,999/month* |
| Individual Profile Page | ✔ | ✔ | ✔ | ✔ |
| Company Page | ✔ | ✔ | ✔ | ✔ |
| AI Search (Intent identification & Mentor suggestion) | ✔ 3 AI sessions (Limited) | ✔ 10 AI Pro sessions/month | ✔ 20 AI Pro sessions/month | ✔ Unlimited |
| Free 1:1 Video Call (AI-suggested Mentor) | ✔ 1 session (30 mins) | ✔ 1 session (30 mins) | ✔ 1 session (30 mins) | ✔ 1 session for 1 member only (30 mins) |
| Paid 1:1 Video Calls with Verified Mentors (45 mins/session) | ✔ 1 session @ ₹4,999 | ✔ 5 sessions/month @ ₹1,499 per session | ✔ 8 sessions/month @ ₹1,499 per session | ✔ 10 sessions/month @ ₹4,999 per session |
| 1:1 Counseling Sessions (Career & Studies) | ✔ Limited sessions @ ₹1,999/session | ✔ 5 sessions/month @ ₹599/session | ✔ 10 sessions/month @ ₹999/session | ❌ |
| Create & Post Content / Videos | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited | ✔ Full personalized team roadmap |
| Roadmap / Whitepaper Download | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited |
| Knowledge Hub Access | Limited | Limited | Unlimited | Unlimited |
| Industry Expert Access | ❌ | ✔ Limited | ✔ Unlimited access (rates as per expert profile) | ✔ Unlimited calls (rates as per expert profile) |
| Live Sessions (1 hr) | ❌ | ✔ 1 session/month | ✔ 2 sessions/month | ✔ 2 sessions/month |
| Courses / Pre-recorded Sessions | ❌ | ✔ Limited access + 30% discount | ✔ Unlimited access + 20% discount | ✔ 10% discount for registered org members |
| Analytics Dashboard | ❌ | ❌ | ✔ Real-time analytics | ✔ Deep analytics |
| Priority Support | ❌ | ❌ | ✔ Chatbot | ✔ Chatbot |
| Exclusive Partner Offers | ❌ | ❌ | ✔ | ✔ |
| Early Access to New Features | ❌ | ❌ | ✔ | ✔ |



## Mentor Membership Plan
**Verification & Registration:** Rs. 5000/-

| Feature / Plan | Silver<br>Rs 999/month | Gold<br>Rs 2,999/month | Platinum<br>Rs 4,999/month | Diamond<br>Rs 9,999/month | Consulting Org*<br>Rs 19,999/month |
|---------------|------------------------|-------------------------|----------------------------|----------------------------|-----------------------------------|
| **Introductory Offer (1st month)** | FREE | ₹999/month | ₹1,999/month | ₹2,999/month | ₹9,999/month* |
| Mentor Profile | ✔ | ✔ | ✔ | ✔ | ✔ |
| Company Page | ✔ | ✔ | ✔ | ✔ | ✔ |
| AI-push search, appearance & visibility | ✔ Limited | ✔ 25 profile appearances/month | ✔ 100 profile appearances/month | ✔ Unlimited (Trending Profile) | ✔ Unlimited |
| Lead Qualifying Session (Free) | ✔ 30 mins | ✔ 30 mins | ✔ 30 mins | ✔ 30 mins | ✔ 30 mins |
| 1:1 Paid Video Sessions* | ✔ 1 session (45 mins) | ✔ 5–10 sessions (45 mins) | ✔ 10–20 sessions (45 mins) | ✔ 20–30 sessions (45 mins) | ✔ 25 sessions (60 mins) |
| Create & Post Content / Videos | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited | ✔ Full personalized team roadmap |
| Roadmap / Whitepaper Upload | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited | ✔ Unlimited |
| Knowledge Hub Access | Limited | Limited | Unlimited | Unlimited | Unlimited |
| Industry Expert Listing | ❌ | ❌ | ✔ 1 category | ✔ Unlimited | ✔ Unlimited |
| Roadmap / Whitepaper Download | ❌ | ❌ | ✔ 1 category | ✔ Unlimited | ✔ Unlimited |
| Live Sessions | ❌ | ❌ | ✔ 2 hrs/month | ✔ 4 hrs/month | ✔ 4 hrs/month |
| Courses / Pre-recorded Videos | ❌ | ❌ | ✔ 2 videos/month (1 hr each) | ✔ 5 videos/month (1 hr each) | ✔ 5 videos/month (1 hr each) |
| Analytics Dashboard | ❌ | ❌ | ✔ Real-time analytics | ✔ Deep analytics | ✔ Deep analytics |
| Priority Support | ❌ | ❌ | ✔ Chatbot | ✔ Chatbot | ✔ Chatbot |
| Exclusive Partner Offers | ❌ | ❌ | ❌ | ✔ | ✔ |
| Early Access to New Features | ❌ | ❌ | ❌ | ✔ | ✔ |

---

## Feature Key Mapping (Admin Setup Reference)

Use the following feature_key + value_type when configuring the plans above in the Admin UI. These keys match `lib/subscriptions/feature-keys.ts`.

### Mentor Feature Mapping

| Feature (Mentor) | feature_key | value_type | Notes |
|---|---|---|---|
| Mentor Profile | `mentor_profile_access` | boolean | Included = true |
| Company Page | `company_page_access` | boolean | Included = true |
| AI-push search, appearances & visibility | `ai_profile_appearances_monthly` | count | limit_count + limit_interval=month |
| Lead Qualifying Session (Free) | `lead_qualifying_session_minutes` | minutes | limit_minutes |
| 1:1 Paid Video Sessions | `mentor_sessions_monthly` | count | limit_count + limit_interval=month |
| Session Duration | `session_duration_minutes` | minutes | limit_minutes |
| Create & Post Content / Videos | `content_posting_access` | boolean/text | Unlimited = limit_text |
| Roadmap / Whitepaper Upload | `roadmap_upload_access` | boolean/text | Unlimited = limit_text |
| Roadmap / Whitepaper Download | `roadmap_download_access` | boolean/count | Optional limit_count |
| Knowledge Hub Access | `knowledge_hub_access_level` | text | "Limited" / "Unlimited" |
| Industry Expert Listing | `industry_expert_listing_limit` | count | limit_count (categories) |
| Live Sessions | `live_sessions_minutes_monthly` | minutes | limit_minutes + limit_interval=month |
| Courses / Pre-recorded Videos | `course_videos_monthly` | count | limit_count + limit_interval=month |
| Analytics Dashboard | `analytics_access_level` | text | "Real-time" / "Deep" |
| Priority Support | `priority_support` | text | "Chatbot" |
| Exclusive Partner Offers | `exclusive_partner_offers_access` | boolean | Included = true |
| Early Access to New Features | `early_access_features` | boolean | Included = true |

### Mentee Feature Mapping

| Feature (Mentee) | feature_key | value_type | Notes |
|---|---|---|---|
| Individual Profile Page | `mentee_profile_access` | boolean | Included = true |
| Company Page | `company_page_access` | boolean | Included = true |
| AI Search (Intent identification & Mentor suggestion) | `ai_search_sessions_monthly` | count | limit_count + limit_interval=month |
| Free 1:1 Video Call | `free_video_sessions_monthly` | count/minutes | limit_count + limit_minutes |
| Paid 1:1 Video Calls | `paid_video_sessions_monthly` | count | limit_count + limit_interval=month |
| 1:1 Counseling Sessions | `counseling_sessions_monthly` | count | limit_count + limit_interval=month |
| Create & Post Content / Videos | `content_posting_access` | boolean/text | Unlimited = limit_text |
| Roadmap / Whitepaper Download | `roadmap_download_access` | boolean/text | Unlimited = limit_text |
| Knowledge Hub Access | `knowledge_hub_access_level` | text | "Limited" / "Unlimited" |
| Industry Expert Access | `industry_expert_access_level` | text | "Limited" / "Unlimited" |
| Live Sessions (1 hr) | `live_sessions_count_monthly` | count | limit_count + limit_interval=month |
| Courses / Pre-recorded Sessions | `courses_access` | text | Optional `course_discount_percent` |
| Analytics Dashboard | `analytics_access_level` | text | "Real-time" / "Deep" |
| Priority Support | `priority_support` | text | "Chatbot" |
| Exclusive Partner Offers | `exclusive_partner_offers_access` | boolean | Included = true |
| Early Access to New Features | `early_access_features` | boolean | Included = true |
| Team Member Limit (Corporates) | `team_member_limit` | count | limit_count |

**Enforcement note:** some keys above are currently used only for UI display until feature-specific enforcement is added in APIs.
