# Mentor Profile System Documentation

> **Last Updated:** 2026-01-09  
> **Purpose:** Documents the mentor profile architecture, edit flow, and display components

---

## Overview

The mentor profile system allows mentors to:
1. Create and update their professional profiles
2. Upload profile pictures and resumes
3. Display their profiles to mentees in explore/dashboard views

---

## Database Schema

### `users` table (`lib/db/schema/users.ts`)

Base user information for all users (mentors, mentees, admins):

| Column | Type | Description |
|--------|------|-------------|
| `id` | text | Primary key (BetterAuth compatible) |
| `email` | text | Unique email address |
| `emailVerified` | boolean | Email verification status |
| `name` | text | Display name |
| `image` | text | OAuth profile image (Google, etc.) |
| `googleId` | text | Google OAuth ID |
| `firstName`, `lastName` | text | Extended profile info |
| `phone`, `bio`, `timezone` | text | Additional profile fields |
| `isActive`, `isBlocked` | boolean | Account status |
| `createdAt`, `updatedAt` | timestamp | Timestamps |

### `mentors` table (`lib/db/schema/mentors.ts`)

Extended mentor-specific profile data:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | text | Foreign key to `users.id` (unique, cascade delete) |
| **Professional Info** | | |
| `title` | text | e.g., "Senior Software Engineer" |
| `company` | text | Current company |
| `industry` | text | e.g., "IT & Software" |
| `expertise` | text | JSON array or CSV of skills |
| `experience` | integer | Years of experience |
| **Mentoring Details** | | |
| `hourlyRate` | decimal | Session rate |
| `currency` | text | Default: "USD" |
| `availability` | text | JSON availability schedule |
| `maxMentees` | integer | Default: 10 |
| **Profile Details** | | |
| `headline` | text | Short professional headline |
| `about` | text | Detailed bio |
| `linkedinUrl`, `githubUrl`, `websiteUrl` | text | Social links |
| **Registration Fields** | | |
| `fullName`, `email`, `phone` | text | Contact info |
| `city`, `state`, `country` | text | Location |
| `profileImageUrl` | text | **URL to uploaded profile picture** |
| `bannerImageUrl` | text | URL to uploaded banner/cover photo (4:1) |
| `resumeUrl` | text | URL to uploaded resume |
| **Verification** | | |
| `verificationStatus` | enum | `YET_TO_APPLY`, `IN_PROGRESS`, `VERIFIED`, `REJECTED`, `REVERIFICATION`, `RESUBMITTED`, `UPDATED_PROFILE` |
| `verificationNotes` | text | Admin notes |
| `isAvailable` | boolean | Availability flag |
| `paymentStatus` | text | Payment status |
| `couponCode`, `isCouponCodeEnabled` | text/boolean | Coupon system |
| `createdAt`, `updatedAt` | timestamp | Timestamps |

### `mentorsProfileAudit` table (`lib/db/schema/mentors-profile-audit.ts`)

Audit trail for profile changes:
- `mentorId`, `userId`
- `previousData` (JSON), `updatedData` (JSON)
- `changedAt`

---

## Storage System

### Storage Provider (`lib/storage/index.ts`)

Configurable storage with Supabase (default) or S3:

```typescript
export const storage = createStorageProvider(); // Supabase or S3

// Helper functions
export const uploadProfilePicture = (file: File, userId: string) => {
  return uploadImage(file, 'profiles', userId);
};

export const uploadBannerImage = (file: File, userId: string) => {
  return uploadImage(file, 'banners', userId);
};

export const uploadResume = async (file: File, userId: string) => {
  // Uploads to: mentors/resumes/resume-{userId}-{timestamp}.{ext}
};
```

**Profile Picture Upload:**
- Path: `profiles/{userId}-{timestamp}.{ext}`
- Max size: 5MB

**Banner Image Upload:**
- Path: `banners/{userId}-{timestamp}.{ext}`
- Max size: 5MB
- Recommended Ratio: 4:1
- Allowed types: JPEG, PNG, WebP
- Returns: Public URL

**Resume Upload:**
- Path: `mentors/resumes/resume-{userId}-{timestamp}.{ext}`
- Max size: 10MB
- Allowed types: PDF, DOC, DOCX
- Returns: Public URL

---

## API Endpoints

### `POST /api/mentors/update-profile` (`app/api/mentors/update-profile/route.ts`)

Handles upload-backed mentor profile updates.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Required - User ID to update |
| `profilePicture` | File | Optional - New profile picture |
| `bannerImage` | File | Optional - New banner image |
| `resume` | File | Optional - New resume |
| `fullName`, `email`, `phone`, etc. | string | Optional - Profile fields |

**Flow:**
1. Auth check - User must be logged in
2. Authorization - Can only update own profile
3. Find existing mentor profile
4. **Handle file uploads:**
   - If new profile picture: Delete old one, upload new, get URL
   - If new resume: Delete old one, upload new, get URL
5. Delegate the profile patch to the shared mentor lifecycle service
6. Create audit log entry
7. Return updated mentor data

**Response:**
```json
{
  "success": true,
  "message": "Mentor profile updated successfully",
  "data": { /* Updated mentor object */ }
}
```

### `GET /api/mentors/[id]` (`app/api/mentors/[id]/route.ts`)

Fetches mentor profile by mentor ID:
- Returns: Full mentor data with user info
- **Image logic:** Uses `profileImageUrl` and `bannerImageUrl`

### `GET /api/mentors` (`app/api/mentors/route.ts`)

Lists all verified mentors:
- Returns: Array of mentor objects with merged profile data
- **Image logic:** `image: mentor.profileImageUrl || mentor.userImage`

### Current User Profile (`profile.me`)

Current-user profile reads now run through the shared profile service and the
`profile.me` tRPC query:
- Returns the authenticated user's roles, mentee profile, and mentor profile
- Resolves mentor `profileImageUrl` and `resumeUrl` through storage before returning

---

## Frontend Components

### Mentor Profile Edit (`components/mentor/dashboard/mentor-profile-edit.tsx`)

Full mentor profile editing interface:

**Features:**
- Profile picture upload with camera overlay
- Resume upload with replace functionality
- All profile fields editable
- Completion percentage tracker
- All profile fields editable
- Completion percentage tracker
- Auto-saves profile picture and banner on upload
- Banner image support with visual preview

**Image Upload Flow:**
```typescript
const handleImageUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('userId', session.user.id);
  formData.append('profilePicture', file);

  // 1. Send the file through the multipart upload route
  const result = await uploadMentorProfileFormMutation.mutateAsync(formData);

  // 2. Update local state with the resolved asset URL
  setMentorData(prev => ({ ...prev, profileImageUrl: result.profileImageUrl }));

  // 3. Force image refresh with cache-busting
  setImageRefresh(Date.now());

  // 4. Refresh user data context
  refreshUserData();
};
```

**Transport Note**

- Multipart uploads stay on HTTP (`/api/mentors/apply`, `/api/mentors/update-profile`) and now cover the profile image, banner, and resume flows.
- Authenticated JSON mentor lifecycle reads/mutations now run through the shared mentor service and the `mentor.*` tRPC router.

**Image Display Logic:**
```typescript
const currentImage = mentorData.profileImageUrl 
  ? `${mentorData.profileImageUrl}?t=${imageRefresh}` // Cache-busting
  : session?.user?.image; // OAuth fallback
```

### Mentor Card (`components/dashboard/mentor-card.tsx`)

Card component for mentor listings:

```tsx
<Avatar className="h-20 w-20">
  <AvatarImage src={mentor.profileImageUrl || undefined} />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
```

### Mentor Detail View (`components/mentee/mentor-detail-view.tsx`)

Full mentor profile page for mentees:

**Image Display:**
```tsx
<Avatar className="w-32 h-32 md:w-44 md:h-44">
  <AvatarImage src={mentor.image || undefined} />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
```

**Note:** `mentor.image` comes from the API which merges `profileImageUrl || userImage`.

### Mentor Sidebar (`components/mentor/sidebars/mentor-sidebar.tsx`)

Navigation sidebar with profile image:
```tsx
<AvatarImage src={mentorProfile?.profileImageUrl || session?.user?.image} />
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROFILE IMAGE FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. UPLOAD (mentor-profile-edit.tsx)                            │
│     ↓                                                            │
│  uploadProfilePicture(file, userId)                             │
│     ↓                                                            │
│  Storage (Supabase/S3) → Returns public URL                     │
│     ↓                                                            │
│  POST /api/mentors/update-profile                               │
│     ↓                                                            │
│  DB: mentors.profileImageUrl = URL                              │
│                                                                  │
│  2. DISPLAY (multiple components)                                │
│     ↓                                                            │
│  GET /api/mentors/[id] or GET /api/mentors                      │
│     ↓                                                            │
│  API returns: image = profileImageUrl || userImage              │
│     ↓                                                            │
│  Frontend: <AvatarImage src={mentor.image} />                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files Summary

```
lib/db/schema/
├── users.ts                    # Base user table
├── mentors.ts                  # Mentor profile table (has profileImageUrl)
└── mentors-profile-audit.ts    # Audit trail

lib/storage/
├── index.ts                    # Storage helpers (uploadProfilePicture, uploadResume)
├── types.ts                    # StorageProvider interface
└── providers/
    ├── supabase.ts             # Supabase storage implementation
    └── s3.ts                   # S3 storage implementation

app/api/mentors/
├── route.ts                    # GET all mentors
├── [id]/route.ts               # GET specific mentor
├── update-profile/route.ts     # POST update mentor profile
└── apply/route.ts              # POST create mentor application

components/
├── mentor/dashboard/
│   └── mentor-profile-edit.tsx # Profile editing UI
├── mentee/
│   └── mentor-detail-view.tsx  # Mentor profile view for mentees
└── dashboard/
    └── mentor-card.tsx         # Mentor card in listings
```

---

## Current Limitations

1. **Single Image Size:** Profile pictures/banners are uploaded at original size (no resizing)
3. **No Cropping:** Images are used as-is without client-side cropping
