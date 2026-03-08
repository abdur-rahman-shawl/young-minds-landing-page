# Mentor Profile Implementation Guide (Low-Level Detail)

This document provides a comprehensive, line-by-line technical breakdown of the Mentor Profile editing functionality.

## 1. Frontend Component: `MentorProfileEdit`

**File Path:** `components/mentor/dashboard/mentor-profile-edit.tsx`

### 1.1. State Management (`mentorData`)

The component uses a single monolithic state object `mentorData` to manage all form fields. This is initialized with default empty strings/values and populated via `useEffect` when the `mentorProfile` context is loaded.

**Full State Initialization:**

```typescript
const [mentorData, setMentorData] = useState({
  fullName: '',
  email: '',
  phone: '',
  title: '',
  company: '',
  city: '',
  state: '',
  country: '',
  industry: '',
  expertise: '',
  experience: '',      // Stored as string in state, converted to Int for API
  about: '',
  linkedinUrl: '',
  githubUrl: '',
  websiteUrl: '',
  hourlyRate: '',      // Stored as string in state, converted to Float for API
  currency: 'USD',
  availability: '',
  headline: '',
  maxMentees: '10',    // Stored as string in state, converted to Int for API
  profileImageUrl: '',
  bannerImageUrl: '',
  resumeUrl: '',
  verificationStatus: 'IN_PROGRESS',
  verificationNotes: '',
  isAvailable: true
})
```

**Auxiliary State:**
*   `isEditing` (boolean): Toggles between "View" and "Edit" modes.
*   `isUploadingImage`, `isUploadingBanner`, `isUploadingResume` (booleans): Loading states for specific upload actions.
*   `error`, `success` (strings | null): Feedback messages displayed in Alerts.
*   `imageRefresh`, `bannerRefresh` (numbers): Timestamp-based cache busters for image URLs.
*   `mentorMeta`: Stores `createdAt` and `updatedAt` timestamps.

### 1.2. Data Synchronization (`useEffect`)

The component synchronizes with the `mentorProfile` context from `useAuth`.
*   **Trigger**: `[mentorProfile, isEditing, session?.user]`
*   **Logic**:
    *   If `mentorProfile` exists AND `!isEditing`, it overwrites `mentorData` with values from the context.
    *   **Fallback Logic**: If specific fields (fullName, email) are missing in the mentor profile, it falls back to `session.user` data.
    *   **Type Conversion**: `experience` and `maxMentees` are converted to strings for input field compatibility.

### 1.3. File Upload Logic

#### A. Profile Picture (`handleImageUpload`)
1.  **Input**: Accepts a `File` object from `<input type="file" />`.
2.  **Storage Upload**: Calls `uploadProfilePicture(file, session.user.id)` which uploads to the `profiles` bucket.
3.  **State Update**: Updates `mentorData.profileImageUrl` with the returned public URL.
4.  **Immediate Persistence**:
    *   Sends a `POST` request to `/api/mentors/update-profile`.
    *   **Payload**: `{ userId: "...", profileImageUrl: "..." }` (JSON).
    *   *Note*: This saves the image URL independently of the rest of the profile form.

#### B. Banner Image (`handleBannerUpload`)
1.  **Input**: Accepts a `File` object.
2.  **Storage Upload**: Calls `uploadBannerImage(file, session.user.id)` which uploads to the `banners` bucket.
3.  **State Update**: Updates `mentorData.bannerImageUrl`.
4.  **Immediate Persistence**:
    *   Sends a `POST` request to `/api/mentors/update-profile`.
    *   **Payload**: `{ userId: "...", bannerImageUrl: "..." }` (JSON).

#### C. Resume (`handleResumeUpload`)
1.  **Validation**:
    *   **Types**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (Extensions: pdf, doc, docx).
    *   **Size**: Max 10MB.
2.  **Persistence Strategy**: uniquely uses `FormData` instead of client-side storage upload + JSON.
3.  **API Call**:
    *   **Endpoint**: `/api/mentors/update-profile`
    *   **Method**: `POST`
    *   **Body**: `FormData` containing:
        *   `userId`: `session.user.id`
        *   `resume`: The raw `File` object.
4.  **Response Handling**: Updates `mentorData.resumeUrl` with the URL returned by the server.

### 1.4. Form Submission (`handleSave`)

Triggered by the "Save Changes" button.

1.  **Data Preparation**: Converts string state values back to numbers.
    *   `experience`: `parseInt`
    *   `hourlyRate`: `parseFloat`
    *   `maxMentees`: `parseInt`
2.  **API Call**:
    *   **Endpoint**: `/api/mentors/update-profile`
    *   **Method**: `POST`
    *   **Headers**: `Content-Type: application/json`
    *   **Payload**:
        ```json
        {
          "userId": "...",
          "fullName": "...",
          "email": "...",
          "phone": "...",
          "title": "...",
          "company": "...",
          "city": "...",
          "state": "...",
          "country": "...",
          "industry": "...",
          "expertise": "...",
          "experience": 5,          // Number
          "about": "...",
          "linkedinUrl": "...",
          "githubUrl": "...",
          "websiteUrl": "...",
          "hourlyRate": 50.0,       // Number
          "currency": "USD",
          "availability": "...",
          "headline": "...",
          "maxMentees": 10,         // Number
          "profileImageUrl": "...",
          "bannerImageUrl": "...",
          "resumeUrl": "...",
          "verificationStatus": "IN_PROGRESS",
          "verificationNotes": "...",
          "isAvailable": true
        }
        ```
3.  **Post-Save Actions**:
    *   Sets `success` message.
    *   Exits edit mode (`setIsEditing(false)`).
    *   Calls `refreshUserData()` to update the global auth context.

## 2. Backend API: `/api/mentors/update-profile`

**File Path:** `app/api/mentors/update-profile/route.ts`

### 2.1. Request Parsing Strategy

The API is designed to handle **both** JSON and FormData requests to support the different upload strategies detailed above.

1.  **Content-Type Check**:
    *   If `multipart/form-data`: parses `request.formData()`. Extracts `profilePicture`, `bannerImage`, `resume` as Files, and other fields as text.
    *   If `application/json`: parses `request.json()`.

2.  **Authorization**:
    *   Validates session via `auth.api.getSession`.
    *   Ensures `userId` in payload matches `session.user.id`.

### 2.2. File Operations (Server-Side)

If files are present in the request (via FormData):
*   **Profile Picture / Banner**:
    *   Deletes old file from storage (if exists).
    *   Uploads new file.
    *   Updates `newProfileImageUrl` / `newBannerImageUrl` variable.
*   **Resume**:
    *   Deletes old resume.
    *   Uploads new resume to `mentors/resumes/`.
    *   Updates `newResumeUrl` variable.

### 2.3. Data Normalization

Before database update, inputs are normalized:
*   **Strings**: Empty strings (`""`) are converted to `null`.
*   **Numbers**: Converted via `Number()`, invalid results become `null`.
*   **Booleans**: Parsed from string "true"/"false" if necessary.

### 2.4. Database Update

1.  **Query**:
    ```typescript
    db.update(mentors)
      .set(mentorUpdateData)
      .where(eq(mentors.userId, userId))
      .returning()
    ```
2.  **Forced Overrides**:
    *   `verificationStatus` is **always** set to `'UPDATED_PROFILE'` on every save. This forces the admin to re-verify the profile after any change.

### 2.5. Audit Logging

Every update triggers an insert into `mentors_profile_audit`:
*   Captures `previousData` (snapshot before update).
*   Captures `updatedData` (snapshot after update).
*   Records `changedAt` timestamp.

## 3. Database Schema: `mentors` Table

**File Path:** `lib/db/schema/mentors.ts`

Full definition of the columns used in this flow:

| Column Name | Data Type | Default | Constraints |
| :--- | :--- | :--- | :--- |
| `id` | uuid | `defaultRandom()` | Primary Key |
| `user_id` | text | - | Foreign Key (users.id), Unique |
| `title` | text | - | |
| `company` | text | - | |
| `industry` | text | - | |
| `expertise` | text | - | |
| `experience_years` | integer | - | Maps to `experience` |
| `hourly_rate` | decimal(10,2) | - | |
| `currency` | text | `'USD'` | |
| `availability` | text | - | JSON string in practice |
| `max_mentees` | integer | `10` | |
| `headline` | text | - | |
| `about` | text | - | |
| `linkedin_url` | text | - | |
| `github_url` | text | - | |
| `website_url` | text | - | |
| `full_name` | text | - | |
| `email` | text | - | |
| `phone` | text | - | |
| `city` | text | - | |
| `state` | text | - | |
| `country` | text | - | |
| `profile_image_url` | text | - | |
| `banner_image_url` | text | - | |
| `resume_url` | text | - | |
| `verification_status` | enum | `'YET_TO_APPLY'` | Enum: `['YET_TO_APPLY', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'REVERIFICATION', 'RESUBMITTED', 'UPDATED_PROFILE']` |
| `verification_notes` | text | - | |
| `is_available` | boolean | `true` | |
| `created_at` | timestamp | `defaultNow()` | |
| `updated_at` | timestamp | `defaultNow()` | |

