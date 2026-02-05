# Mentor Dashboard Replication Guide

> **Purpose:** Complete implementation guide to replicate the SharingMinds mentor dashboard in another Next.js application  
> **Target Audience:** Developers replicating this system  
> **Assumptions:** Target app already has `users` and `mentors` base tables with same user IDs

---

## Table of Contents

1. [Prerequisites & Assumptions](#prerequisites--assumptions)
2. [Database Setup](#database-setup)
   - [Required Enums](#required-enums)
   - [Required Tables](#required-tables)
   - [Initial Data Seeding](#initial-data-seeding)
3. [Drizzle Schema Files](#drizzle-schema-files)
4. [API Routes Implementation](#api-routes-implementation)
5. [Frontend Components](#frontend-components)
6. [Hooks Implementation](#hooks-implementation)
7. [Implementation Checklist](#implementation-checklist)

---

## Prerequisites & Assumptions

### Tech Stack Requirements
- **Framework:** Next.js 14+ (App Router)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **UI:** Shadcn/UI + Tailwind CSS
- **Auth:** Better-Auth (or compatible auth system)
- **State:** SWR or React Query

### Existing Tables in Target App
The target app is assumed to have:

```sql
-- Already exists in target app
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  google_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Already exists in target app
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  -- Add these columns if missing (see Section 2)
);
```

---

## Database Setup

### Required Enums

Create these PostgreSQL enums first:

```sql
-- Mentor Verification Status
CREATE TYPE verification_status AS ENUM (
  'YET_TO_APPLY',
  'IN_PROGRESS', 
  'VERIFIED',
  'REJECTED',
  'REVERIFICATION',
  'RESUBMITTED',
  'UPDATED_PROFILE'
);

-- Notification Types
CREATE TYPE notification_type AS ENUM (
  'BOOKING_REQUEST',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'SESSION_REMINDER',
  'SESSION_COMPLETED',
  'PAYMENT_RECEIVED',
  'MESSAGE_RECEIVED',
  'PROFILE_UPDATED',
  'SYSTEM_ANNOUNCEMENT',
  'MENTOR_APPLICATION_APPROVED',
  'MENTOR_APPLICATION_REJECTED',
  'MENTOR_APPLICATION_UPDATE_REQUESTED',
  'RESCHEDULE_REQUEST',
  'RESCHEDULE_ACCEPTED',
  'RESCHEDULE_REJECTED',
  'RESCHEDULE_COUNTER',
  'RESCHEDULE_WITHDRAWN',
  'SESSION_REASSIGNED',
  'REASSIGNMENT_ACCEPTED',
  'REASSIGNMENT_REJECTED'
);

-- Availability Types
CREATE TYPE recurrence_pattern AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE availability_type AS ENUM ('AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED');

-- Content Types
CREATE TYPE content_type AS ENUM ('COURSE', 'FILE', 'URL');
CREATE TYPE content_item_type AS ENUM ('VIDEO', 'PDF', 'DOCUMENT', 'URL', 'TEXT');
CREATE TYPE course_difficulty AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE content_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Message Types
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'audio', 'video', 'system', 'request_accepted', 'request_rejected');
CREATE TYPE message_status AS ENUM ('sending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE thread_status AS ENUM ('active', 'archived', 'deleted');

-- Review Types
CREATE TYPE reviewer_role AS ENUM ('mentor', 'mentee');
```

### Required Tables

#### 1. Update Existing `mentors` Table

**Add these columns to your existing `mentors` table:**

```sql
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS expertise TEXT; -- JSON array as text
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS availability TEXT; -- JSON schedule
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS max_mentees INTEGER DEFAULT 10;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'YET_TO_APPLY' NOT NULL;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING' NOT NULL;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_coupon_code_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
```

#### 2. Roles & User Roles Tables

```sql
-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,        -- 'admin', 'mentor', 'mentee'
  display_name TEXT NOT NULL,       -- 'Admin', 'Mentor', 'Mentee'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User-Role mapping (composite primary key)
CREATE TABLE user_roles (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role_id TEXT REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  assigned_by TEXT REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);
```

#### 3. Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mentee_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Session details
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled' NOT NULL, -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
  
  -- Timing
  scheduled_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Meeting details
  meeting_url TEXT,
  meeting_type TEXT DEFAULT 'video', -- 'video', 'audio', 'in_person', 'chat'
  location TEXT,
  
  -- Pricing
  rate DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- Notes
  mentor_notes TEXT,
  mentee_notes TEXT,
  
  -- Cancellation and rescheduling
  cancelled_by TEXT, -- 'mentor' | 'mentee'
  cancellation_reason TEXT,
  rescheduled_from UUID REFERENCES sessions(id),
  reschedule_count INTEGER DEFAULT 0 NOT NULL,
  mentor_reschedule_count INTEGER DEFAULT 0 NOT NULL,
  no_show_marked_by TEXT, -- 'mentor' | 'system'
  no_show_marked_at TIMESTAMP,
  
  -- Refund tracking
  refund_amount DECIMAL(10,2),
  refund_percentage INTEGER,
  refund_status TEXT DEFAULT 'none', -- 'none', 'pending', 'processed', 'failed'
  
  -- Pending reschedule
  pending_reschedule_request_id UUID,
  pending_reschedule_time TIMESTAMP,
  pending_reschedule_by TEXT,
  
  -- Auto-reassignment
  was_reassigned BOOLEAN DEFAULT FALSE NOT NULL,
  reassigned_from_mentor_id TEXT,
  reassigned_at TIMESTAMP,
  reassignment_status TEXT, -- 'pending_acceptance', 'accepted', 'rejected', 'awaiting_mentee_choice'
  cancelled_mentor_ids JSONB DEFAULT '[]' NOT NULL,
  
  -- Recording
  recording_config JSONB DEFAULT '{"enabled": true, "resolution": "1280x720", "fps": 30}' NOT NULL,
  
  -- Review flags
  is_reviewed_by_mentor BOOLEAN DEFAULT FALSE NOT NULL,
  is_reviewed_by_mentee BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sessions_mentor ON sessions(mentor_id);
CREATE INDEX idx_sessions_mentee ON sessions(mentee_id);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status ON sessions(status);
```

#### 4. Mentor Availability Tables

```sql
-- Main availability schedule
CREATE TABLE mentor_availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Global settings
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  default_session_duration INTEGER DEFAULT 60 NOT NULL, -- minutes
  buffer_time INTEGER DEFAULT 15 NOT NULL, -- minutes
  
  -- Booking constraints
  min_advance_booking_hours INTEGER DEFAULT 24 NOT NULL,
  max_advance_booking_days INTEGER DEFAULT 90 NOT NULL,
  
  -- Business hours defaults
  default_start_time TIME DEFAULT '09:00:00',
  default_end_time TIME DEFAULT '17:00:00',
  
  -- Flags
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  allow_instant_booking BOOLEAN DEFAULT TRUE NOT NULL,
  require_confirmation BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Weekly recurring patterns
CREATE TABLE mentor_weekly_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE NOT NULL,
  
  day_of_week INTEGER NOT NULL, -- 0-6 (Sunday-Saturday)
  is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  time_blocks JSONB DEFAULT '[]' NOT NULL,
  -- Example: [{"startTime": "09:00", "endTime": "12:00", "type": "AVAILABLE", "maxBookings": 1}]
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Availability exceptions (holidays, vacations)
CREATE TABLE mentor_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE NOT NULL,
  
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  type availability_type DEFAULT 'BLOCKED' NOT NULL,
  reason TEXT,
  is_full_day BOOLEAN DEFAULT TRUE NOT NULL,
  time_blocks JSONB,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Availability templates
CREATE TABLE availability_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT FALSE NOT NULL,
  configuration JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Special availability rules
CREATE TABLE mentor_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### 5. Mentor Content Tables (Courses)

```sql
-- Main content table
CREATE TABLE mentor_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  type content_type NOT NULL,
  status content_status DEFAULT 'DRAFT' NOT NULL,
  
  -- For FILE type
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- For URL type
  url TEXT,
  url_title TEXT,
  url_description TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES mentor_content(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  difficulty course_difficulty NOT NULL,
  duration_minutes INTEGER,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  thumbnail_url TEXT,
  category TEXT,
  tags TEXT, -- JSON array
  prerequisites TEXT, -- JSON array
  learning_outcomes TEXT, -- JSON array
  
  enrollment_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Course modules
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  learning_objectives TEXT, -- JSON array
  estimated_duration_minutes INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Course sections
CREATE TABLE course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Section content items
CREATE TABLE section_content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES course_sections(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  type content_item_type NOT NULL,
  order_index INTEGER NOT NULL,
  
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  duration_seconds INTEGER,
  is_preview BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### 6. Messaging Tables

```sql
-- Message threads
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  participant1_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  participant2_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  status thread_status DEFAULT 'active' NOT NULL,
  
  last_message_id UUID,
  last_message_at TIMESTAMP,
  last_message_preview TEXT,
  
  participant1_unread_count INTEGER DEFAULT 0,
  participant2_unread_count INTEGER DEFAULT 0,
  
  participant1_last_read_at TIMESTAMP,
  participant2_last_read_at TIMESTAMP,
  
  participant1_muted BOOLEAN DEFAULT FALSE,
  participant2_muted BOOLEAN DEFAULT FALSE,
  participant1_muted_until TIMESTAMP,
  participant2_muted_until TIMESTAMP,
  
  participant1_archived BOOLEAN DEFAULT FALSE,
  participant2_archived BOOLEAN DEFAULT FALSE,
  participant1_archived_at TIMESTAMP,
  participant2_archived_at TIMESTAMP,
  
  participant1_deleted BOOLEAN DEFAULT FALSE,
  participant2_deleted BOOLEAN DEFAULT FALSE,
  participant1_deleted_at TIMESTAMP,
  participant2_deleted_at TIMESTAMP,
  
  total_messages INTEGER DEFAULT 0,
  metadata TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text' NOT NULL,
  status message_status DEFAULT 'sending' NOT NULL,
  
  reply_to_id UUID,
  
  is_read BOOLEAN DEFAULT FALSE,
  is_delivered BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  read_at TIMESTAMP,
  delivered_at TIMESTAMP,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_size TEXT,
  attachment_name TEXT,
  
  metadata TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Message reactions
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  UNIQUE(message_id, user_id, emoji)
);
```

#### 7. Reviews Tables

```sql
-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  reviewer_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reviewee_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reviewer_role reviewer_role NOT NULL,
  
  final_score DECIMAL(3,2) NOT NULL,
  feedback TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX session_reviewer_idx ON reviews(session_id, reviewer_id);

-- Review questions
CREATE TABLE review_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  role reviewer_role NOT NULL,
  weight DECIMAL(4,2) NOT NULL, -- e.g., 0.25 for 25%
  is_active TEXT DEFAULT 'true' NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL
);

-- Review ratings
CREATE TABLE review_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES review_questions(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL -- 1-5 stars
);
```

#### 8. Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  related_id UUID,
  related_type TEXT,
  
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  
  action_url TEXT,
  action_text TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  read_at TIMESTAMP,
  archived_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

#### 9. Mentoring Relationships Table

```sql
CREATE TABLE mentoring_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mentee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'active', 'paused', 'completed', 'cancelled'
  
  goals TEXT,
  duration TEXT,
  frequency TEXT,
  
  rate DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  billing_type TEXT DEFAULT 'per_session', -- 'per_session', 'monthly', 'package'
  
  progress TEXT, -- JSON
  milestones TEXT, -- JSON
  
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  paused_at TIMESTAMP,
  
  approved_by_mentor BOOLEAN DEFAULT FALSE,
  approved_by_mentee BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### 10. Reschedule Requests Table

```sql
CREATE TABLE reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  
  initiated_by TEXT NOT NULL, -- 'mentor' | 'mentee'
  initiator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'accepted', 'rejected', 'counter_proposed', 'cancelled', 'expired'
  
  proposed_time TIMESTAMP NOT NULL,
  proposed_duration INTEGER,
  original_time TIMESTAMP NOT NULL,
  
  counter_proposed_time TIMESTAMP,
  counter_proposed_by TEXT,
  counter_proposal_count INTEGER DEFAULT 0 NOT NULL,
  
  resolved_by TEXT,
  resolver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  resolution_note TEXT,
  
  cancellation_reason TEXT,
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### 11. Session Policies Table

```sql
CREATE TABLE session_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  policy_key TEXT UNIQUE NOT NULL,
  policy_value TEXT NOT NULL,
  policy_type TEXT DEFAULT 'string' NOT NULL, -- 'integer', 'boolean', 'string', 'json'
  description TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### 12. Session Audit Log Table

```sql
CREATE TABLE session_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL, -- 'cancel' or 'reschedule'
  reason_category TEXT,
  reason_details TEXT,
  
  previous_scheduled_at TIMESTAMP,
  new_scheduled_at TIMESTAMP,
  
  policy_snapshot JSONB,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### 13. Audit Trail Tables

```sql
-- Mentor form audit trail
CREATE TABLE mentors_form_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  
  submission_type TEXT NOT NULL, -- 'CREATE' | 'UPDATE'
  verification_status TEXT,
  form_data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Mentor profile audit
CREATE TABLE mentors_profile_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Initial Data Seeding

```sql
-- Seed roles
INSERT INTO roles (name, display_name, description) VALUES
  ('admin', 'Admin', 'System administrator with full access'),
  ('mentor', 'Mentor', 'Platform mentor who provides guidance'),
  ('mentee', 'Mentee', 'User seeking mentorship');

-- Seed default session policies
INSERT INTO session_policies (policy_key, policy_value, policy_type, description) VALUES
  ('cancellation_cutoff_hours', '2', 'integer', 'Minimum hours before session to allow mentee cancellation'),
  ('reschedule_cutoff_hours', '4', 'integer', 'Minimum hours before session to allow mentee rescheduling'),
  ('max_reschedules_per_session', '2', 'integer', 'Maximum number of times a mentee can reschedule a session'),
  ('mentor_cancellation_cutoff_hours', '1', 'integer', 'Minimum hours before session to allow mentor cancellation'),
  ('mentor_reschedule_cutoff_hours', '2', 'integer', 'Minimum hours before session to allow mentor rescheduling'),
  ('mentor_max_reschedules_per_session', '2', 'integer', 'Maximum number of times a mentor can reschedule a session'),
  ('free_cancellation_hours', '24', 'integer', 'Hours before session for penalty-free cancellation'),
  ('require_cancellation_reason', 'true', 'boolean', 'Whether a cancellation reason is mandatory'),
  ('partial_refund_percentage', '70', 'integer', 'Refund % when mentee cancels between free_cancellation_hours and cancellation_cutoff_hours'),
  ('late_cancellation_refund_percentage', '0', 'integer', 'Refund % when mentee cancels after cancellation_cutoff_hours'),
  ('reschedule_request_expiry_hours', '48', 'integer', 'Hours until reschedule request auto-expires'),
  ('max_counter_proposals', '3', 'integer', 'Maximum rounds of counter-proposals allowed per reschedule request');

-- Seed review questions for mentors (asked to mentees about mentor)
INSERT INTO review_questions (question_text, role, weight, is_active, display_order) VALUES
  ('How well did the mentor explain concepts?', 'mentor', 0.25, 'true', 1),
  ('How prepared was the mentor for the session?', 'mentor', 0.25, 'true', 2),
  ('How engaging and interactive was the session?', 'mentor', 0.25, 'true', 3),
  ('Would you recommend this mentor to others?', 'mentor', 0.25, 'true', 4);
```

---

## Drizzle Schema Files

Create these files in `lib/db/schema/`:

### File Structure

```
lib/db/schema/
├── index.ts           # Export all schemas
├── users.ts           # (existing - may need updates)
├── roles.ts
├── user-roles.ts
├── mentors.ts         # (existing - may need updates)
├── sessions.ts
├── mentor-availability.ts
├── mentor-content.ts
├── messages.ts
├── message-threads.ts
├── message-reactions.ts
├── mentoring-relationships.ts
├── reviews.ts
├── notifications.ts
├── reschedule-requests.ts
├── session-policies.ts
├── session-audit-log.ts
├── mentors-form-audit-trail.ts
└── mentors-profile-audit.ts
```

### index.ts

```typescript
// Export all schema files
export * from './users';
export * from './roles';
export * from './user-roles';
export * from './mentors';
export * from './sessions';
export * from './mentor-availability';
export * from './mentor-content';
export * from './messages';
export * from './message-threads';
export * from './message-reactions';
export * from './mentoring-relationships';
export * from './reviews';
export * from './notifications';
export * from './reschedule-requests';
export * from './session-policies';
export * from './session-audit-log';
export * from './mentors-form-audit-trail';
export * from './mentors-profile-audit';
```

> **Note:** Full Drizzle schema TypeScript files are available in the original SharingMinds codebase. Copy the files from `lib/db/schema/` directory.

---

## API Routes Implementation

### Directory Structure

```
app/api/
├── mentor/
│   ├── dashboard-stats/route.ts
│   ├── mentees/route.ts
│   ├── mentees-sessions/route.ts
│   ├── payments/route.ts
│   ├── recent-messages/route.ts
│   └── recent-sessions/route.ts
├── mentors/
│   ├── route.ts
│   ├── apply/route.ts
│   ├── update-profile/route.ts
│   ├── [id]/
│   │   ├── route.ts
│   │   └── availability/
│   │       ├── route.ts
│   │       └── exceptions/route.ts
│   └── content/
│       ├── route.ts
│       ├── [id]/route.ts
│       ├── modules/route.ts
│       ├── sections/route.ts
│       └── upload/route.ts
├── sessions/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── needs-review/route.ts
│   └── reschedule/route.ts
├── messages/route.ts
├── messaging/
│   ├── threads/route.ts
│   └── send/route.ts
├── reviews/route.ts
├── notifications/route.ts
└── analytics/
    └── mentor/route.ts
```

### Key API: Dashboard Stats

**File:** `app/api/mentor/dashboard-stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMentorDashboardStats } from '@/lib/db/queries/mentor-dashboard-stats';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getMentorDashboardStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
```

### Key Query: Dashboard Stats

**File:** `lib/db/queries/mentor-dashboard-stats.ts`

```typescript
import { db } from '@/lib/db';
import { sessions, users, reviews, messages } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface MentorDashboardStats {
  activeMentees: number;
  totalMentees: number;
  upcomingSessions: number;
  completedSessions: number;
  monthlyEarnings: number;
  totalEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  unreadMessages: number;
  totalMessages: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
}

export async function getMentorDashboardStats(mentorId: string): Promise<MentorDashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const nowStr = now.toISOString();
  const startOfMonthStr = startOfMonth.toISOString();
  const endOfMonthStr = endOfMonth.toISOString();
  const startOfLastMonthStr = startOfLastMonth.toISOString();
  const endOfLastMonthStr = endOfLastMonth.toISOString();

  // Get session statistics
  const sessionStats = await db
    .select({
      totalMentees: sql<number>`COUNT(DISTINCT ${sessions.menteeId})::int`,
      activeMentees: sql<number>`COUNT(DISTINCT CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= ${nowStr} THEN ${sessions.menteeId} END)::int`,
      upcomingSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'scheduled' AND ${sessions.scheduledAt} >= ${nowStr} THEN 1 ELSE 0 END)::int`,
      completedSessions: sql<number>`SUM(CASE WHEN ${sessions.status} = 'completed' THEN 1 ELSE 0 END)::int`,
      monthlyEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.status} = 'completed' AND ${sessions.endedAt} >= ${startOfMonthStr} AND ${sessions.endedAt} <= ${endOfMonthStr} THEN ${sessions.rate} ELSE 0 END), 0)::decimal`,
      totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.status} = 'completed' THEN ${sessions.rate} ELSE 0 END), 0)::decimal`,
      sessionsThisMonth: sql<number>`SUM(CASE WHEN ${sessions.scheduledAt} >= ${startOfMonthStr} AND ${sessions.scheduledAt} <= ${endOfMonthStr} THEN 1 ELSE 0 END)::int`,
      sessionsLastMonth: sql<number>`SUM(CASE WHEN ${sessions.scheduledAt} >= ${startOfLastMonthStr} AND ${sessions.scheduledAt} <= ${endOfLastMonthStr} THEN 1 ELSE 0 END)::int`,
    })
    .from(sessions)
    .where(eq(sessions.mentorId, mentorId));

  // Get review statistics
  const reviewStats = await db
    .select({
      averageRating: sql<number>`AVG(${reviews.finalScore})::decimal(3,2)`,
      totalReviews: sql<number>`COUNT(${reviews.id})::int`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.revieweeId, mentorId),
        eq(reviews.reviewerRole, 'mentee')
      )
    );

  // Get message statistics
  const messageStats = await db
    .select({
      unreadMessages: sql<number>`SUM(CASE WHEN ${messages.isRead} = false THEN 1 ELSE 0 END)::int`,
      totalMessages: sql<number>`COUNT(${messages.id})::int`,
    })
    .from(messages)
    .where(eq(messages.receiverId, mentorId));

  return {
    activeMentees: sessionStats[0]?.activeMentees || 0,
    totalMentees: sessionStats[0]?.totalMentees || 0,
    upcomingSessions: sessionStats[0]?.upcomingSessions || 0,
    completedSessions: sessionStats[0]?.completedSessions || 0,
    monthlyEarnings: parseFloat(sessionStats[0]?.monthlyEarnings || '0'),
    totalEarnings: parseFloat(sessionStats[0]?.totalEarnings || '0'),
    averageRating: reviewStats[0]?.averageRating ? parseFloat(reviewStats[0].averageRating) : null,
    totalReviews: reviewStats[0]?.totalReviews || 0,
    unreadMessages: messageStats[0]?.unreadMessages || 0,
    totalMessages: messageStats[0]?.totalMessages || 0,
    sessionsThisMonth: sessionStats[0]?.sessionsThisMonth || 0,
    sessionsLastMonth: sessionStats[0]?.sessionsLastMonth || 0,
  };
}
```

---

## Frontend Components

### Directory Structure

```
components/mentor/
├── availability/
│   ├── availability-exceptions.tsx
│   ├── availability-settings.tsx
│   ├── availability-templates.tsx
│   ├── mentor-availability-manager.tsx
│   └── weekly-schedule-editor.tsx
├── content/
│   ├── content.tsx
│   ├── course-builder.tsx
│   ├── create-content-dialog.tsx
│   ├── create-content-item-dialog.tsx
│   ├── create-course-dialog.tsx
│   ├── create-module-dialog.tsx
│   ├── create-section-dialog.tsx
│   ├── edit-content-dialog.tsx
│   └── video-preview-dialog.tsx
├── dashboard/
│   ├── mentee-card.tsx
│   ├── mentor-analytics-section.tsx
│   ├── mentor-dashboard.tsx
│   ├── mentor-mentees.tsx
│   ├── mentor-only-dashboard.tsx
│   ├── mentor-payment-gate.tsx
│   ├── mentor-profile-edit.tsx
│   ├── mentor-profile.tsx
│   └── session-mentee-card.tsx
└── sidebars/
    └── mentor-sidebar.tsx
```

### Mentor Sidebar Navigation

The sidebar has 11 sections:

| Section | Key | Icon | Description |
|---------|-----|------|-------------|
| Dashboard | `dashboard` | LayoutDashboard | Overview with KPIs |
| My Mentees | `mentees` | Users | List of mentees |
| Schedule | `schedule` | Calendar | Session calendar |
| Availability | `availability` | CalendarClock | Availability management |
| Messages | `messages` | MessageSquare | Messaging (with unread badge) |
| Earnings | `earnings` | DollarSign | Revenue tracking |
| Reviews | `reviews` | Star | Mentee reviews |
| Analytics | `analytics` | BarChart3 | Performance analytics |
| My Content | `content` | BookOpen | Course/content management |
| Profile | `profile` | User | Profile editing |
| Settings | `settings` | Settings | Account settings |

---

## Hooks Implementation

### Directory Structure

```
hooks/
├── use-mentor-analytics.ts
├── use-mentor-dashboard.ts
├── use-mentor-detail.ts
├── use-mentor-mentees.ts
├── use-mentor-mentees-sessions.ts
└── queries/
    └── use-mentor-queries.ts
```

### Key Hook: Dashboard Stats

**File:** `hooks/use-mentor-dashboard.ts`

```typescript
import useSWR from 'swr';

interface MentorDashboardStats {
  activeMentees: number;
  totalMentees: number;
  upcomingSessions: number;
  completedSessions: number;
  monthlyEarnings: number;
  totalEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  unreadMessages: number;
  totalMessages: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
};

export function useMentorDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<MentorDashboardStats>(
    '/api/mentor/dashboard-stats',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60000,
    }
  );

  return { stats: data, isLoading, error, mutate };
}

export function useMentorRecentSessions(limit: number = 5) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/mentor/recent-sessions?limit=${limit}`,
    fetcher
  );

  return {
    sessions: data?.sessions || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useMentorPendingReviews(user: any) {
  const key = user?.id ? '/api/sessions/needs-review' : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  return {
    sessionsToReview: data?.data || [],
    isLoading: user?.id ? isLoading : false,
    error,
    mutate,
  };
}

export function useMentorRecentMessages(limit: number = 5) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/mentor/recent-messages?limit=${limit}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    messages: data?.messages || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create all required PostgreSQL enums
- [ ] Update existing `mentors` table with new columns
- [ ] Create `roles` and `user_roles` tables
- [ ] Create `sessions` table
- [ ] Create mentor availability tables (4 tables)
- [ ] Create mentor content tables (5 tables)
- [ ] Create messaging tables (3 tables)
- [ ] Create `reviews` and related tables (3 tables)
- [ ] Create `notifications` table
- [ ] Create `mentoring_relationships` table
- [ ] Create `reschedule_requests` table
- [ ] Create policy and audit tables (4 tables)
- [ ] Seed initial data (roles, policies, review questions)

### Phase 2: Drizzle Schema Files
- [ ] Create/update all schema files in `lib/db/schema/`
- [ ] Update `index.ts` to export all schemas
- [ ] Run `npm run db:generate` to verify schemas
- [ ] Run `npm run db:push` to apply to database

### Phase 3: API Routes
- [ ] Implement `/api/mentor/dashboard-stats`
- [ ] Implement `/api/mentor/mentees`
- [ ] Implement `/api/mentor/recent-sessions`
- [ ] Implement `/api/mentor/recent-messages`
- [ ] Implement `/api/mentors` (GET all, POST create)
- [ ] Implement `/api/mentors/apply` (POST application)
- [ ] Implement `/api/mentors/[id]` (GET details)
- [ ] Implement `/api/mentors/[id]/availability` (GET/PUT)
- [ ] Implement `/api/mentors/content` (GET/POST/PUT/DELETE)
- [ ] Implement `/api/sessions` (GET/POST/PUT)
- [ ] Implement `/api/reviews` (GET/POST)
- [ ] Implement `/api/notifications` (GET/POST/PUT)
- [ ] Implement `/api/analytics/mentor` (GET)

### Phase 4: Hooks
- [ ] Create `use-mentor-dashboard.ts`
- [ ] Create `use-mentor-analytics.ts`
- [ ] Create `use-mentor-detail.ts`
- [ ] Create `use-mentor-mentees.ts`

### Phase 5: UI Components
- [ ] Create `mentor-sidebar.tsx`
- [ ] Create `mentor-dashboard.tsx`
- [ ] Create `mentor-only-dashboard.tsx`
- [ ] Create `mentor-profile.tsx`
- [ ] Create `mentor-profile-edit.tsx`
- [ ] Create `mentor-analytics-section.tsx`
- [ ] Create `mentor-mentees.tsx`
- [ ] Create availability management components (5 files)
- [ ] Create content management components (9 files)

### Phase 6: Integration & Testing
- [ ] Set up authentication context
- [ ] Configure protected routes
- [ ] Test dashboard loading
- [ ] Test profile editing
- [ ] Test availability management
- [ ] Test sessions display
- [ ] Test messaging
- [ ] Test analytics

---

## Quick Reference: Key Relationships

```
users (1) ─────────────── (1) mentors
  │                            │
  │                            ├── mentor_availability_schedules
  │                            │     ├── mentor_weekly_patterns
  │                            │     ├── mentor_availability_exceptions
  │                            │     └── mentor_availability_rules
  │                            │
  │                            ├── mentor_content
  │                            │     └── courses
  │                            │           └── course_modules
  │                            │                 └── course_sections
  │                            │                       └── section_content_items
  │                            │
  │                            └── availability_templates
  │
  ├── sessions ─────────────── reviews
  │     │                         └── review_ratings
  │     │
  │     ├── reschedule_requests
  │     └── session_audit_log
  │
  ├── message_threads
  │     └── messages
  │           └── message_reactions
  │
  ├── notifications
  │
  ├── user_roles ────────── roles
  │
  └── mentoring_relationships
```

---

## Notes for Developer

1. **User ID Consistency:** Ensure the `users.id` in the target app matches the format used here (TEXT type, typically from auth provider).

2. **File Uploads:** The original uses custom upload functions (`uploadProfilePicture`, `uploadResume`). You'll need to implement these using your preferred storage solution (S3, Cloudinary, etc.).

3. **Email Notifications:** The original sends emails via `sendApplicationReceivedEmail`. Implement email service integration as needed.

4. **Auth Context:** The original uses a custom `useAuth` hook from `@/contexts/auth-context`. Create an equivalent that provides `session`, `primaryRole`, and `mentorProfile`.

5. **LiveKit Integration:** For video sessions, the original uses LiveKit. This can be replaced with your preferred video solution.

6. **Styling:** All components use Tailwind CSS and Shadcn/UI. Ensure these are set up in the target app.

---

**Document Version:** 1.0  
**Created:** February 5, 2026  
**Source:** SharingMinds Application
