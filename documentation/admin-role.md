# Admin Role Documentation

> **Last Updated:** February 5, 2026  
> **Purpose:** Comprehensive low-level documentation of the Admin user role, including database schemas, API endpoints, components, and actions.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Admin API Endpoints](#4-admin-api-endpoints)
5. [Admin Dashboard Components](#5-admin-dashboard-components)
6. [Admin Actions & Workflows](#6-admin-actions--workflows)
7. [Admin Sessions Management](#7-admin-sessions-management) ⭐ NEW
8. [Audit Trail System](#8-audit-trail-system)
9. [Email Notifications](#9-email-notifications)
10. [File Structure Reference](#10-file-structure-reference)

---

## 1. Overview

The Admin role provides full administrative control over the platform, including:
- Mentor application verification (approve/reject/request updates)
- Mentee profile viewing
- **Session management and intervention** (force cancel, refund, reassign, etc.)
- Subscription and plan management
- Platform analytics and KPIs
- Contact enquiry management
- Audit trail of all admin actions

---

## 2. Database Schema

### 2.1 Roles Table

**File:** `lib/db/schema/roles.ts`

```typescript
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),        // 'admin', 'mentor', 'mentee'
  displayName: text('display_name').notNull(),  // 'Admin', 'Mentor', 'Mentee'
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Sample Data:**
| id | name | displayName | description |
|----|------|-------------|-------------|
| uuid | admin | Admin | Platform administrator |
| uuid | mentor | Mentor | Verified mentor |
| uuid | mentee | Mentee | Registered mentee |

---

### 2.2 User Roles Table (Junction)

**File:** `lib/db/schema/user-roles.ts`

```typescript
export const userRoles = pgTable('user_roles', {
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: text('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: text('assigned_by').references(() => users.id), // Who assigned this role
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));
```

**Relations:**
```typescript
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  assignedByUser: one(users, { fields: [userRoles.assignedBy], references: [users.id] }),
}));
```

---

### 2.3 Admin Audit Trail Table

**File:** `lib/db/schema/admin-audit-trail.ts`

```typescript
export const adminAuditTrail = pgTable('admin_audit_trail', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetId: text('target_id'),
  targetType: text('target_type'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Tracked Actions:**
| action | targetType | details |
|--------|------------|---------|
| `MENTOR_VERIFICATION_STATUS_CHANGED` | `mentor` | `{ newStatus, notes, couponIssued }` |
| `ENQUIRY_STATUS_CHANGED` | `enquiry` | `{ newStatus }` |
| `COUPON_CODE_SENT` | `mentor` | `{ couponCode }` |

---

## 3. Authentication & Authorization

### 3.1 Middleware Protection

**File:** `middleware.ts`

```typescript
// Admin-only routes
const ADMIN_ROUTES = ['/admin'];

// Middleware routes matched
export const config = {
  matcher: [
    '/api/admin/:path*',
    '/admin/:path*',
  ],
};
```

**Protection Flow:**
1. Check for session cookie (`better-auth.session_token`)
2. If no cookie → redirect to `/auth` (pages) or return 401 (API)
3. Admin API routes rely on `ensureAdmin()` in route handlers for role verification

---

### 3.2 ensureAdmin() Helper Function

**File:** `app/api/admin/mentors/route.ts` (pattern used across all admin routes)

```typescript
export async function ensureAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return { error: NextResponse.json(
      { success: false, error: 'Authentication required' }, 
      { status: 401 }
    )};
  }

  const userWithRoles = await getUserWithRoles(session.user.id);
  const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

  if (!isAdmin) {
    return { error: NextResponse.json(
      { success: false, error: 'Admin access required' }, 
      { status: 403 }
    )};
  }

  return { session };
}
```

---

### 3.3 Auth Context Integration

**File:** `contexts/auth-context.tsx`

```typescript
interface AuthState {
  isAdmin: boolean;   // Computed from roles
  isMentor: boolean;
  isMentee: boolean;
  // ...
}

// Computed in AuthProviderInner:
const isAdmin = sessionData?.isAdmin || false;
```

**Session API Response:**
**File:** `app/api/auth/session-with-roles/route.ts`

```typescript
return {
  session,
  roles,
  isAdmin: userWithRoles.roles.some(r => r.name === 'admin'),
  isMentor: userWithRoles.roles.some(r => r.name === 'mentor'),
  isMentee: userWithRoles.roles.some(r => r.name === 'mentee'),
};
```

---

### 3.4 User Helper Functions

**File:** `lib/db/user-helpers.ts`

```typescript
export async function getUserWithRoles(userId: string) {
  // Fetches user and joins with roles via user_roles table
  // Returns: { user, roles: [{ name, displayName }] }
}
```

---

## 4. Admin API Endpoints

### 4.1 Mentor Management

#### GET /api/admin/mentors
**File:** `app/api/admin/mentors/route.ts`

**Purpose:** Fetch all mentors with full profile details

**Response:**
```typescript
{
  success: true,
  data: [{
    id: string,
    userId: string,
    name: string,
    email: string,
    image: string | null,
    title: string | null,
    company: string | null,
    industry: string | null,
    headline: string | null,
    about: string | null,
    experienceYears: number | null,
    expertise: string[],
    hourlyRate: string | null,
    currency: string | null,
    verificationStatus: VerificationStatus,
    verificationNotes: string | null,
    isAvailable: boolean | null,
    resumeUrl: string | null,
    linkedinUrl: string | null,
    websiteUrl: string | null,
    profileImageUrl: string | null,
    phone: string | null,
    githubUrl: string | null,
    location: string,
    city: string | null,
    state: string | null,
    country: string | null,
    couponCode: string | null,
    isCouponCodeEnabled: boolean | null,
    paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | null,
    createdAt: string | null,
    updatedAt: string | null,
  }]
}
```

---

#### PATCH /api/admin/mentors
**File:** `app/api/admin/mentors/route.ts`

**Purpose:** Update mentor verification status

**Request Body:**
```typescript
{
  mentorId: string,           // UUID
  status: VerificationStatus, // 'VERIFIED' | 'REJECTED' | 'REVERIFICATION'
  notes?: string,             // Optional note (max 1000 chars)
  enableCoupon?: boolean,     // Enable coupon code on approval
}
```

**Verification Statuses:**
```typescript
type VerificationStatus =
  | 'YET_TO_APPLY'    // Initial state, profile incomplete
  | 'IN_PROGRESS'     // Application submitted, awaiting review
  | 'VERIFIED'        // Approved mentor
  | 'REJECTED'        // Application rejected
  | 'REVERIFICATION'  // Admin requested updates
  | 'RESUBMITTED'     // Mentor resubmitted after reverification
  | 'UPDATED_PROFILE' // Verified mentor updated their profile
```

**Side Effects:**
- Logs action to `admin_audit_trail`
- Sends email notification based on status
- Sends in-app notification to mentor

---

#### POST /api/admin/mentors/coupon
**File:** `app/api/admin/mentors/coupon/route.ts`

**Purpose:** Generate and send coupon code to verified mentor

**Request Body:**
```typescript
{
  mentorId: string
}
```

---

#### GET /api/admin/mentors/[mentorId]/audit
**File:** `app/api/admin/mentors/[mentorId]/audit/route.ts`

**Purpose:** Fetch profile change audit history for a mentor

**Response:** Profile field changes with before/after values

---

### 4.2 Mentee Management

#### GET /api/admin/mentees
**File:** `app/api/admin/mentees/route.ts`

**Purpose:** Fetch all registered mentees

**Response:**
```typescript
{
  success: true,
  data: [{
    id: string,
    userId: string,
    name: string,
    email: string,
    image: string | null,
    currentRole: string | null,
    currentCompany: string | null,
    careerGoals: string | null,
    interests: string[],
    skillsToLearn: string[],
    currentSkills: string[],
    education: string[],
    learningStyle: string | null,
    preferredMeetingFrequency: string | null,
    createdAt: string | null,
    updatedAt: string | null,
  }]
}
```

---

### 4.3 Enquiry Management

#### GET /api/admin/enquiries
**File:** `app/api/admin/enquiries/route.ts`

**Purpose:** Fetch all contact form submissions

**Response:**
```typescript
{
  success: true,
  data: [{
    id: string,
    name: string,
    email: string,
    subject: string,
    message: string,
    consent: boolean,
    userAgent: string | null,
    ipAddress: string | null,
    isResolved: boolean,
    createdAt: string | null,
  }]
}
```

---

#### PATCH /api/admin/enquiries/[id]
**File:** `app/api/admin/enquiries/[id]/route.ts`

**Purpose:** Toggle enquiry resolved status

**Request Body:**
```typescript
{
  isResolved: boolean
}
```

---

### 4.4 Subscription Management

#### GET /api/admin/subscriptions/stats
**File:** `app/api/admin/subscriptions/stats/route.ts`

**Response:**
```typescript
{
  success: true,
  data: {
    totalPlans: number,
    activePlans: number,
    totalFeatures: number,
    activeSubscriptions: number,
  }
}
```

---

#### GET/POST /api/admin/subscriptions/plans
**File:** `app/api/admin/subscriptions/plans/route.ts`

**Purpose:** CRUD operations for subscription plans

---

#### GET/POST /api/admin/subscriptions/features
**File:** `app/api/admin/subscriptions/features/route.ts`

**Purpose:** CRUD operations for plan features

---

### 4.5 Analytics

#### GET /api/analytics/admin
**File:** `app/api/analytics/admin/route.ts`

**Query Parameters:**
```
startDate: ISO date string
endDate: ISO date string
```

**Response:**
```typescript
{
  kpis: {
    activeMentees: { current: number, change: number },
    totalSessions: { current: number, change: number },
    paidConversionRate: number,
    averageSessionRating: number,
  },
  sessionsOverTime: [{ date: string, sessions: number }],
  topUniversities: [{ name: string, mentions: number }],
  topMenteeQuestions: [{ query: string, mentions: number }],
  mentorLeaderboard: [{
    mentorId: string,
    name: string,
    sessionsCompleted: number,
    averageRating: string,
  }],
}
```

---

## 5. Admin Dashboard Components

### 5.1 Dashboard Shell & Sidebar

**Admin Sidebar:**
**File:** `components/admin/sidebars/admin-sidebar.tsx`

```typescript
const items = [
  { key: "dashboard", title: "Overview", icon: LayoutDashboard },
  { key: "mentors", title: "Mentors", icon: GraduationCap },
  { key: "mentees", title: "Mentees", icon: Users },
  { key: "sessions", title: "Sessions", icon: CalendarClock },  // NEW
  { key: "subscriptions", title: "Subscriptions", icon: CreditCard },
  { key: "analytics", title: "Analytics", icon: BarChart3 },
  { key: "enquiries", title: "Enquiries", icon: Inbox },
  { key: "settings", title: "Settings", icon: Settings },
];
```

---

### 5.2 Overview Section

**File:** `components/admin/dashboard/admin-overview.tsx`

**Features:**
- Total mentors count with availability breakdown
- Total mentees count
- Pending mentor applications count
- Sessions scheduled this week
- Verification rate percentage
- Recent signups (last 7 days)
- Enquiries pending count

---

### 5.3 Mentors Management

**File:** `components/admin/dashboard/admin-mentors.tsx` (1414 lines)

**Features:**
- Tabbed view: Pending | Verified | Rejected
- Mentor card with:
  - Name, headline, location
  - Contact info (email, phone)
  - External links (LinkedIn, Resume, Website, GitHub)
  - Expertise tags
  - Verification status badge
  - Availability status
  - Verification notes
- **Actions per mentor:**
  - ✅ Approve (with optional coupon code)
  - ❌ Reject (with required notes)
  - 🔄 Request Updates (with required notes)
  - 📧 Send Coupon Code (for verified mentors with pending payment)
- Detailed mentor view dialog
- Profile audit viewer for `UPDATED_PROFILE` status

**Related Components:**
- `components/admin/dashboard/MentorAuditView.tsx` - Shows profile change diffs

---

### 5.4 Mentees Management

**File:** `components/admin/dashboard/admin-mentees.tsx`

**Features:**
- List all registered mentees
- View mentee profiles:
  - Current role & company
  - Career goals
  - Skills (current & to learn)
  - Interests
  - Education
  - Learning preferences

---

### 5.5 Subscriptions Management

**File:** `components/admin/dashboard/admin-subscriptions.tsx`

**Sub-components:**
- `subscriptions/plans-management.tsx` - CRUD for subscription plans
- `subscriptions/features-management.tsx` - CRUD for plan features
- `subscriptions/subscriptions-overview.tsx` - Active subscriptions list
- `subscriptions/usage-analytics.tsx` - Usage statistics

**Stats Cards:**
- Total Plans / Active Plans
- Total Features
- Active Subscriptions
- Monthly Revenue

---

### 5.6 Analytics Dashboard

**File:** `app/admins/analytics/page.tsx`

**Features:**
- Date range picker
- KPI cards:
  - Active Mentees (with % change)
  - Sessions count (with % change)
  - Paid Conversion Rate
  - Average Session Rating
- Sessions over time line chart
- Top mentee questions list
- Top universities searched (doughnut chart)
- Mentor leaderboard (sessions completed, rating)

---

### 5.7 Enquiries Management

**File:** `components/admin/dashboard/admin-enquiries.tsx`

**Features:**
- List all contact form submissions
- Search and filter
- View enquiry details:
  - Sender name & email
  - Subject & message
  - Submission timestamp
  - User agent / IP address
  - Consent status
- Toggle resolved/unresolved status
- Filter by status (All | Pending | Resolved)

---

## 6. Admin Actions & Workflows

### 6.1 Mentor Verification Workflow

```
                    ┌─────────────────┐
                    │  YET_TO_APPLY   │
                    │ (Mentor signs   │
                    │  up, incomplete)│
                    └────────┬────────┘
                             │ Mentor submits application
                             ▼
                    ┌─────────────────┐
                    │  IN_PROGRESS    │
                    │ (Awaiting admin │
                    │     review)     │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   VERIFIED   │  │   REJECTED   │  │REVERIFICATION│
    │  (Approved)  │  │  (Denied)    │  │(Updates      │
    │              │  │              │  │ requested)   │
    └──────┬───────┘  └──────────────┘  └──────┬───────┘
           │                                    │
           │ Updates profile                    │ Mentor resubmits
           ▼                                    ▼
    ┌──────────────┐                    ┌──────────────┐
    │UPDATED_PROFILE│                   │  RESUBMITTED │
    │(Admin reviews │◄──────────────────│ (Back to     │
    │ changes)     │                    │  review)     │
    └──────────────┘                    └──────────────┘
```

---

### 6.2 Admin Action Effects

| Action | API Call | Email Sent | Notification | Audit Log |
|--------|----------|------------|--------------|-----------|
| Approve Mentor | `PATCH /api/admin/mentors` | `sendMentorApplicationApprovedEmail` | `MENTOR_APPLICATION_APPROVED` | ✅ |
| Reject Mentor | `PATCH /api/admin/mentors` | `sendMentorApplicationRejectedEmail` | `MENTOR_APPLICATION_REJECTED` | ✅ |
| Request Updates | `PATCH /api/admin/mentors` | `sendMentorApplicationReverificationRequestEmail` | `MENTOR_APPLICATION_UPDATE_REQUESTED` | ✅ |
| Send Coupon | `POST /api/admin/mentors/coupon` | Coupon email | - | ✅ |
| Resolve Enquiry | `PATCH /api/admin/enquiries/[id]` | - | - | ✅ |

---

## 7. Admin Sessions Management

> **Status:** Planned  
> **Full Documentation:** See [booking-system.md → Admin Sessions Management](./booking-system.md#admin-sessions-management)

The Admin Sessions Dashboard provides full visibility and control over all platform sessions.

### 7.1 Dashboard Features

| Feature | Description |
|---------|-------------|
| **KPI Cards** | Total sessions, completed, cancelled, no-show rate, revenue, refunds |
| **Sessions Table** | Filterable, sortable, paginated list of all sessions |
| **Session Detail Panel** | Full session info with mentor/mentee profiles, timeline, notes |
| **Bulk Actions** | Export to CSV, bulk cancel |

### 7.2 Admin Actions on Sessions

| Action | API Endpoint | Audit Action |
|--------|--------------|---------------|
| **Force Cancel** | `POST /api/admin/sessions/[id]/cancel` | `ADMIN_FORCE_CANCEL` |
| **Force Complete** | `POST /api/admin/sessions/[id]/complete` | `ADMIN_FORCE_COMPLETE` |
| **Issue Refund** | `POST /api/admin/sessions/[id]/refund` | `ADMIN_MANUAL_REFUND` |
| **Reassign Session** | `POST /api/admin/sessions/[id]/reassign` | `ADMIN_REASSIGN_SESSION` |
| **Clear No-Show** | `POST /api/admin/sessions/[id]/clear-no-show` | `ADMIN_CLEAR_NO_SHOW` |
| **Override Policy** | `POST /api/admin/sessions/[id]/override-policy` | `ADMIN_POLICY_OVERRIDE` |
| **Add Note** | `POST /api/admin/sessions/[id]/notes` | `ADMIN_NOTE_ADDED` |

### 7.3 New Database Tables

| Table | File | Purpose |
|-------|------|---------|
| `admin_session_audit_trail` | `lib/db/schema/admin-session-audit-trail.ts` | Logs all admin session actions |
| `admin_session_notes` | `lib/db/schema/admin-session-notes.ts` | Internal notes on sessions |
| `session_disputes` | `lib/db/schema/session-disputes.ts` | Dispute tracking (optional) |

### 7.4 Session-Specific API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/sessions` | GET | Fetch all sessions (paginated, filtered) |
| `/api/admin/sessions/stats` | GET | Dashboard statistics |
| `/api/admin/sessions/export` | GET | Export to CSV |
| `/api/admin/sessions/[id]` | GET | Session details |
| `/api/admin/sessions/[id]/cancel` | POST | Force cancel |
| `/api/admin/sessions/[id]/complete` | POST | Force complete |
| `/api/admin/sessions/[id]/refund` | POST | Manual refund |
| `/api/admin/sessions/[id]/reassign` | POST | Reassign to different mentor |
| `/api/admin/sessions/[id]/clear-no-show` | POST | Clear no-show flag |
| `/api/admin/sessions/[id]/override-policy` | POST | Bypass policy limits |
| `/api/admin/sessions/[id]/notes` | GET/POST | Admin notes |

### 7.5 Session Admin Emails

| Email | Trigger | Recipients |
|-------|---------|------------|
| `sendAdminCancelledSessionEmail` | Admin force-cancels | Mentor + Mentee |
| `sendAdminRefundIssuedEmail` | Admin issues refund | Mentee |
| `sendAdminReassignedToMenteeEmail` | Admin reassigns | Mentee |
| `sendAdminAssignedToMentorEmail` | Admin reassigns | New Mentor |

### 7.6 Components

| Component | File | Purpose |
|-----------|------|---------|
| `AdminSessions` | `admin-sessions.tsx` | Main sessions dashboard |
| `SessionDetailPanel` | `session-detail-panel.tsx` | Side panel with full details |
| `SessionsTable` | `sessions/sessions-table.tsx` | Data table component |
| `SessionsFilters` | `sessions/sessions-filters.tsx` | Filter controls |
| Action Dialogs | `sessions/*.tsx` | Force cancel, refund, reassign dialogs |

> 📖 **For full implementation details**, see [booking-system.md → Admin Sessions Management](./booking-system.md#admin-sessions-management)

---

## 8. Audit Trail System

### 7.1 Logging Function

**File:** `lib/db/audit.ts`

```typescript
interface LogAdminActionParams {
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
}

export async function logAdminAction({
  adminId,
  action,
  targetId,
  targetType,
  details,
}: LogAdminActionParams) {
  await db.insert(adminAuditTrail).values({
    adminId,
    action,
    targetId,
    targetType,
    details,
  });
}
```

---

### 7.2 Action Types Logged

| Action | Description |
|--------|-------------|
| `MENTOR_VERIFICATION_STATUS_CHANGED` | Admin changed mentor verification status |
| `COUPON_CODE_SENT` | Admin sent coupon code to mentor |
| `ENQUIRY_STATUS_CHANGED` | Admin marked enquiry as resolved/unresolved |

---

## 9. Email Notifications

### 8.1 Mentor Application Emails

**File:** `lib/email.ts`

| Function | Trigger |
|----------|---------|
| `sendMentorApplicationApprovedEmail(email, name, couponCode?)` | Mentor approved |
| `sendMentorApplicationRejectedEmail(email, name, reason)` | Mentor rejected |
| `sendMentorApplicationReverificationRequestEmail(email, name, notes)` | Updates requested |

---

## 10. File Structure Reference

```
young-minds-landing-page/
├── app/
│   ├── admins/
│   │   └── analytics/
│   │       └── page.tsx                    # Analytics dashboard page
│   └── api/
│       └── admin/
│           ├── enquiries/
│           │   ├── route.ts                # GET enquiries
│           │   └── [id]/
│           │       └── route.ts            # PATCH enquiry status
│           ├── mentees/
│           │   └── route.ts                # GET mentees
│           ├── mentors/
│           │   ├── route.ts                # GET/PATCH mentors
│           │   ├── coupon/
│           │   │   └── route.ts            # POST send coupon
│           │   └── [mentorId]/
│           │       └── audit/
│           │           └── route.ts        # GET mentor audit
│           ├── sessions/
│           │   ├── route.ts                # GET all sessions
│           │   ├── stats/
│           │   │   └── route.ts            # GET dashboard stats
│           │   ├── export/
│           │   │   └── route.ts            # GET CSV export
│           │   └── [id]/
│           │       ├── route.ts            # GET session details
│           │       ├── cancel/route.ts     # POST force cancel
│           │       ├── complete/route.ts   # POST force complete
│           │       ├── refund/route.ts     # POST manual refund
│           │       ├── reassign/route.ts   # POST reassign
│           │       ├── clear-no-show/route.ts
│           │       ├── override-policy/route.ts
│           │       └── notes/route.ts      # GET/POST admin notes
│           └── subscriptions/
│               ├── stats/
│               │   └── route.ts            # GET subscription stats
│               ├── plans/
│               │   └── route.ts            # GET/POST plans
│               └── features/
│                   └── route.ts            # GET/POST features
│
├── components/
│   └── admin/
│       ├── dashboard/
│       │   ├── admin-dashboard.tsx         # Main dashboard wrapper
│       │   ├── admin-overview.tsx          # Overview section
│       │   ├── admin-mentors.tsx           # Mentors management (1400+ lines)
│       │   ├── admin-mentees.tsx           # Mentees management
│       │   ├── admin-sessions.tsx          # Sessions management (NEW)
│       │   ├── session-detail-panel.tsx    # Session detail side panel (NEW)
│       │   ├── admin-enquiries.tsx         # Enquiries management
│       │   ├── admin-subscriptions.tsx     # Subscriptions management
│       │   ├── MentorAuditView.tsx         # Profile change diff viewer
│       │   ├── sessions/                   # Session action dialogs (NEW)
│       │   │   ├── sessions-table.tsx
│       │   │   ├── sessions-filters.tsx
│       │   │   ├── force-cancel-dialog.tsx
│       │   │   ├── manual-refund-dialog.tsx
│       │   │   └── reassign-dialog.tsx
│       │   └── subscriptions/
│       │       ├── plans-management.tsx
│       │       ├── features-management.tsx
│       │       ├── subscriptions-overview.tsx
│       │       └── usage-analytics.tsx
│       └── sidebars/
│           └── admin-sidebar.tsx           # Admin navigation sidebar
│
├── contexts/
│   └── auth-context.tsx                    # isAdmin flag exposed
│
├── lib/
│   ├── auth.ts                             # Better-auth configuration
│   ├── auth-client.ts                      # Client-side auth utilities
│   ├── email.ts                            # Email sending functions
│   └── db/
│       ├── audit.ts                        # logAdminAction() function
│       ├── user-helpers.ts                 # getUserWithRoles()
│       └── schema/
│           ├── roles.ts                    # roles table
│           ├── user-roles.ts               # user_roles table
│           ├── admin-audit-trail.ts        # admin_audit_trail table
│           ├── admin-session-audit-trail.ts # Session action audit (NEW)
│           ├── admin-session-notes.ts      # Internal session notes (NEW)
│           ├── session-disputes.ts         # Dispute tracking (NEW)
│           ├── mentors.ts                  # mentors table
│           ├── mentees.ts                  # mentees table
│           └── contact-submissions.ts      # contact_submissions table
│
├── hooks/
│   ├── use-session-with-roles.ts           # Hook with isAdmin
│   └── queries/
│       └── use-session-query.ts            # React Query session hook
│
├── middleware.ts                           # Route protection middleware
│
└── scripts/
    └── make-user-admin.ts                  # Script to assign admin role
```

---

## 11. Utility Scripts

### Make User Admin

**File:** `make-user-admin.ts`

Script to manually assign the admin role to a user via their email or user ID.

```bash
npx tsx make-user-admin.ts <user-email>
```

---

## 12. Future Considerations

- [ ] Admin settings page implementation
- [ ] Role-based permissions (super admin vs regular admin)
- [ ] Bulk mentor actions
- [ ] Export functionality for mentors/mentees data
- [ ] Admin activity dashboard (view all admin actions)
- [ ] Two-factor authentication for admin accounts
- [ ] Real-time session status updates (WebSocket)
- [ ] Automated no-show detection
- [ ] Session quality scoring
- [ ] Slack/Discord notifications for disputes
- [ ] Two-admin approval for high-value refunds
