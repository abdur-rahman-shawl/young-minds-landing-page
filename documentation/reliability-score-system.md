# Reliability Score System - Future Implementation Plan

> **Status:** Planned (Not Yet Implemented)  
> **Created:** 2026-02-04  
> **Priority:** To be determined

---

## Overview

This document outlines the design for a reliability score system for mentors and mentees. The system will track cancellation patterns, no-shows, and overall platform reliability to incentivize good behavior and maintain trust.

---

## Industry Research Summary

### Sources Analyzed
- Uber driver/rider reliability systems
- Airbnb host/guest cancellation policies
- General marketplace platform best practices

### Key Patterns from Industry Leaders

| Practice | Description | Platform Examples |
|----------|-------------|-------------------|
| **Completion Rate** | % of accepted bookings that complete successfully | Uber, Airbnb |
| **Cancellation Rate** | Track cancellations as % of total bookings | Both |
| **Rolling Window** | Calculate over last 30-90 days, not lifetime | Uber |
| **Grace Period** | New users get leniency (first 5-10 bookings) | Both |
| **Severity Weighting** | Late cancellations penalized more than early ones | Both |
| **Positive Reinforcement** | Completing sessions improves score faster than cancellations hurt | Airbnb |
| **Visibility** | Show reliability badge/indicator to other party | Both |
| **Tiered Penalties** | Different penalty amounts based on timing | Uber |

### Uber's Approach
- Riders incur cancellation fees after a grace period (2-15 min depending on service)
- Repeat offenses lead to temporary inability to request rides
- Drivers compensated for cancellations after they're en route
- Both parties can dispute unfair charges

### Airbnb's Approach
- Hosts penalized $100-$1000 for cancellations (based on timing)
- Automated reviews posted on profile indicating cancellation
- Impacts search ranking and Superhost status
- Guests subject to host's chosen cancellation policy (Flexible/Moderate/Strict)

---

## Proposed Scoring Model

### Base Algorithm

```
Reliability Score = 0 to 100 (rolling 90-day window)

Starting Point: 100 (all new users)

Events:
- Cancellation: -5 to -15 (based on timing)
- No-show: -20
- Completed session: +2 (gradual recovery)
- Minimum score: 0
- Maximum score: 100
```

### Cancellation Penalty Matrix

| Timing Before Session | Mentor Penalty | Mentee Penalty | Rationale |
|-----------------------|----------------|----------------|-----------|
| 24+ hours | -5 | -5 | Minimal disruption |
| 12-24 hours | -8 | -8 | Some disruption |
| 2-12 hours | -12 | -10 | Significant disruption |
| < 2 hours | -15 | -12 | Severe disruption |
| No-show | -20 | -20 | Maximum penalty |

**Note:** Mentors penalized slightly more for late cancellations as mentees have less ability to recover.

### Score Thresholds & Status

| Score Range | Status | Badge | Impact |
|-------------|--------|-------|--------|
| 90-100 | Excellent | ⭐ Gold Star | Priority in matching, premium badge on profile |
| 70-89 | Good | ✅ Green Check | Normal operation |
| 50-69 | Fair | ⚠️ Yellow Warning | Warning displayed to booking party |
| 30-49 | Poor | 🔴 Red Alert | Internal review, possible restrictions |
| < 30 | Critical | ❌ Suspended | Account suspension, manual review required |

---

## Database Design

### Option A: Add to Users Table (Simple)

```sql
ALTER TABLE users ADD COLUMN reliability_score INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN reliability_last_calculated TIMESTAMP;
```

**Pros:** Simple, fast queries
**Cons:** No history, harder to recalculate

### Option B: Dedicated Table (Recommended)

```sql
CREATE TABLE reliability_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Current snapshot
    score INTEGER DEFAULT 100 NOT NULL,
    status TEXT DEFAULT 'good' NOT NULL, -- 'excellent', 'good', 'fair', 'poor', 'critical'
    
    -- 30-day rolling stats
    completed_sessions_30d INTEGER DEFAULT 0 NOT NULL,
    cancelled_sessions_30d INTEGER DEFAULT 0 NOT NULL,
    no_shows_30d INTEGER DEFAULT 0 NOT NULL,
    
    -- 90-day rolling stats
    completed_sessions_90d INTEGER DEFAULT 0 NOT NULL,
    cancelled_sessions_90d INTEGER DEFAULT 0 NOT NULL,
    no_shows_90d INTEGER DEFAULT 0 NOT NULL,
    
    -- Metadata
    last_calculated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id)
);

CREATE INDEX idx_reliability_user ON reliability_scores(user_id);
CREATE INDEX idx_reliability_score ON reliability_scores(score);
```

### Score Event Log (For Auditing)

```sql
CREATE TABLE reliability_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    event_type TEXT NOT NULL, -- 'completed', 'cancelled', 'no_show', 'manual_adjustment'
    score_change INTEGER NOT NULL, -- e.g., -10, +2
    score_before INTEGER NOT NULL,
    score_after INTEGER NOT NULL,
    
    hours_before_session INTEGER, -- For cancellations: timing context
    notes TEXT, -- Optional admin notes for manual adjustments
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_reliability_events_user ON reliability_events(user_id);
CREATE INDEX idx_reliability_events_created ON reliability_events(created_at);
```

---

## API & Service Design

### Core Service: `lib/services/reliability-score.ts`

```typescript
// Core functions to implement
export async function updateReliabilityScore(
    userId: string,
    eventType: 'completed' | 'cancelled' | 'no_show',
    context?: { hoursBeforeSession?: number; sessionId?: string }
): Promise<void>;

export async function getReliabilityScore(userId: string): Promise<{
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    stats30d: { completed: number; cancelled: number; noShows: number };
}>;

export function calculatePenalty(
    eventType: 'cancelled' | 'no_show',
    hoursBeforeSession?: number
): number;

export async function recalculateFromHistory(userId: string): Promise<void>;
// For disputes or fixing data issues
```

### Integration Points

| Trigger | Action |
|---------|--------|
| Session cancelled via `/api/bookings/[id]/cancel` | Call `updateReliabilityScore(userId, 'cancelled', { hoursBeforeSession })` |
| Session marked no-show via `/api/bookings/[id]/no-show` | Call `updateReliabilityScore(userId, 'no_show')` |
| Session completed (status change or after end time) | Call `updateReliabilityScore(userId, 'completed')` |

---

## Frontend Integration

### Display Locations

1. **Mentor Profile Card** (browsing mentors)
   - Show reliability badge (⭐/✅/⚠️)
   - Tooltip with score percentage

2. **Booking Confirmation**
   - Display mentor's reliability status
   - For scores <70: Show subtle warning

3. **User Dashboard**
   - "Your Reliability Score" widget
   - Breakdown: Completed (X), Cancelled (Y), No-shows (Z) in last 30 days
   - Tips to improve score

4. **Session History**
   - Show which sessions affected score

### Badge Components

```tsx
// components/reliability-badge.tsx
interface ReliabilityBadgeProps {
    score: number;
    showScore?: boolean; // Show numeric score or just badge
    size?: 'sm' | 'md' | 'lg';
}
```

---

## Open Questions (To Decide Before Implementation)

1. **Visibility to mentees:** Should mentees see the mentor's exact score, or just a badge (Excellent/Good/Fair)?

2. **Account restrictions:** Should scores below 50 automatically trigger:
   - Reduced visibility in search results?
   - Temporary suspension from accepting new bookings?
   - Required manual review?

3. **Score recovery:** Should there be a "redemption" mechanism?
   - E.g., 5 consecutive completed sessions removes 1 cancellation penalty
   - Time-based decay: Old cancellations drop off after 90 days

4. **Grace period:** Should new users (first 5-10 sessions) have reduced penalties?

5. **Dispute process:** How can users contest unfair score impacts?

6. **Admin tools:** Should admins be able to manually adjust scores?

---

## Implementation Phases

### Phase 1: Backend Infrastructure
- [ ] Create database tables
- [ ] Implement `reliability-score.ts` service
- [ ] Integrate with cancel/no-show/complete APIs
- [ ] Add migration scripts

### Phase 2: Frontend Display
- [ ] Create ReliabilityBadge component
- [ ] Add to mentor profile cards
- [ ] Add to booking confirmation
- [ ] Add dashboard widget

### Phase 3: Enforcement & Policies
- [ ] Implement automatic account review for low scores
- [ ] Add admin tools for score management
- [ ] Create dispute resolution flow

---

## Verification Plan

### Unit Tests
- Penalty calculation for different timings
- Score calculation with multiple events
- Status determination based on score

### Integration Tests
- Score updates on session cancellation
- Score updates on session completion
- Rolling window calculations

### Manual Testing
1. Cancel a session → verify score decreases correctly
2. Complete 5 sessions → verify score increases
3. Verify badges display correctly across UI
4. Test edge cases (score at 0, score at 100)

---

## References

- Uber Help: Cancellation Fees
- Airbnb Host Cancellation Policy
- Marketplace Trust & Safety Best Practices (Stripe)
- Two-Sided Marketplace Metrics (YC)
