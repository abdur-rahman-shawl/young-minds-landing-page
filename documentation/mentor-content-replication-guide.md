# Mentor "My Content" — Replication Guide

> **Purpose**: Everything a developer needs to replicate the **My Content** section of the mentor dashboard in a separate Next.js + Drizzle ORM codebase. Covers the database schema, all 9 API routes, 4 frontend components, React Query hooks, file upload pipeline, and a phased implementation checklist.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Database Schema](#3-database-schema)
4. [API Endpoints Reference](#4-api-endpoints-reference)
5. [Frontend Components](#5-frontend-components)
6. [React Query Hooks](#6-react-query-hooks)
7. [File Upload Pipeline](#7-file-upload-pipeline)
8. [Data-Flow Walkthroughs](#8-data-flow-walkthroughs)
9. [Dependencies](#9-dependencies)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Feature Overview

The My Content section lets mentors:

- **Create content** in three forms: `COURSE`, `FILE`, and `URL`
- **Browse & filter** all their content (All / Courses / Files / URLs tabs)
- **Edit content** metadata, status (DRAFT → PUBLISHED → ARCHIVED), and type-specific fields (file replacement, URL updates)
- **Delete content** (with cascade to course data)
- **Build courses** with a module → section → content-item hierarchy
- **Upload files** (PDF, video, DOC, images) to Supabase Storage

### Content Types

| Type | Description | Key Fields |
|---|---|---|
| `COURSE` | Structured learning; requires a separate `courses` row with modules/sections | `difficulty`, `price`, `category`, `learningOutcomes` |
| `FILE` | Uploaded binary file | `fileUrl`, `fileName`, `fileSize`, `mimeType` |
| `URL` | External link | `url`, `urlTitle`, `urlDescription` |

### Content Statuses (lifecycle)

```
DRAFT  →  PUBLISHED  →  ARCHIVED
```
- `DRAFT`: Not visible to mentees
- `PUBLISHED`: Visible to mentees
- `ARCHIVED`: Hidden (soft-remove)

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│                                                                 │
│  MentorContent (orchestrator)                                   │
│    ├── Tabs: All / Courses / Files / URLs                       │
│    ├── ContentCard (per item — memoized)                        │
│    ├── CreateContentDialog (multi-step wizard)                  │
│    ├── EditContentDialog   (tabbed — Details, Media, Analytics) │
│    └── CourseBuilder       (full-screen course management)      │
│         ├── CreateCourseDialog  (course metadata setup)         │
│         ├── CreateModuleDialog  (add module)                    │
│         ├── CreateSectionDialog (add section to module)         │
│         ├── CreateContentItemDialog (add item to section)       │
│         ├── EditItemDialog        (edit module/section/item)    │
│         └── ReorderableModules   (drag-drop reorder)           │
│                                                                 │
│  Hooks: use-content-queries.ts                                  │
│  (React Query: useContentList, useContent, useCreateContent,    │
│   useUpdateContent, useDeleteContent, useCreateCourse,          │
│   useUploadFile)                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / fetch
┌──────────────────────────▼──────────────────────────────────────┐
│                     API ROUTES (Next.js)                         │
│                                                                 │
│  /api/mentors/content                 GET, POST                 │
│  /api/mentors/content/[id]            GET, PUT, DELETE          │
│  /api/mentors/content/[id]/course     POST, PUT                 │
│  /api/mentors/content/[id]/course/modules          GET, POST    │
│  /api/mentors/content/[id]/course/modules/[modId]  PUT, DELETE  │
│  /api/mentors/content/modules/[modId]/sections     GET, POST    │
│  /api/mentors/content/modules/[modId]/sections/[secId]  PUT,DELETE│
│  /api/mentors/content/sections/[secId]/content-items    GET,POST │
│  /api/mentors/content/sections/[secId]/content-items/[id] PUT,DELETE│
│  /api/upload                          POST (multipart)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Drizzle ORM
┌──────────────────────────▼──────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                        │
│                                                                 │
│  mentor_content           (1:many from mentors)                 │
│  courses                  (1:1 from mentor_content, COURSE type)│
│  course_modules           (1:many from courses)                 │
│  course_sections          (1:many from course_modules)          │
│  section_content_items    (1:many from course_sections)         │
│                                                                 │
│  External: Supabase Storage (mentors/content/{type}/{filename}) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

**File**: `lib/db/schema/mentor-content.ts`

### 3.1 Enums

```typescript
export const contentTypeEnum = pgEnum('content_type', ['COURSE', 'FILE', 'URL']);

export const contentItemTypeEnum = pgEnum('content_item_type', [
  'VIDEO', 'PDF', 'DOCUMENT', 'URL', 'TEXT'
]);

export const courseDifficultyEnum = pgEnum('course_difficulty', [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
]);

export const contentStatusEnum = pgEnum('content_status', [
  'DRAFT', 'PUBLISHED', 'ARCHIVED'
]);
```

### 3.2 `mentor_content` — Root Content Record

One row per content piece. Stores all three types in a single table with nullable type-specific columns.

```typescript
export const mentorContent = pgTable('mentor_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id')
    .references(() => mentors.id, { onDelete: 'cascade' })
    .notNull(),

  // Shared
  title: text('title').notNull(),
  description: text('description'),
  type: contentTypeEnum('type').notNull(),
  status: contentStatusEnum('status').default('DRAFT').notNull(),

  // FILE type fields
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),   // bytes
  mimeType: text('mime_type'),

  // URL type fields
  url: text('url'),
  urlTitle: text('url_title'),
  urlDescription: text('url_description'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.3 `courses` — Course Metadata (COURSE type only)

One row per `mentor_content` of type `COURSE`. Added in a second step by the mentor after initial content creation.

```typescript
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id')
    .references(() => mentorContent.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),

  difficulty: courseDifficultyEnum('difficulty').notNull(),
  duration: integer('duration_minutes'),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),

  thumbnailUrl: text('thumbnail_url'),
  category: text('category'),

  // JSON string arrays (stored as text, parsed on read)
  tags: text('tags'),
  prerequisites: text('prerequisites'),
  learningOutcomes: text('learning_outcomes'),

  enrollmentCount: integer('enrollment_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

> **Note**: `tags`, `prerequisites`, and `learningOutcomes` are stored as JSON-stringified arrays.
> Use `JSON.stringify([...])` on write and `JSON.parse(...)` / `safeJsonParse(...)` on read.

### 3.4 `course_modules` — Modules within a Course

```typescript
export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),

  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  learningObjectives: text('learning_objectives'), // JSON array
  estimatedDurationMinutes: integer('estimated_duration_minutes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.5 `course_sections` — Sections within a Module

```typescript
export const courseSections = pgTable('course_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id')
    .references(() => courseModules.id, { onDelete: 'cascade' })
    .notNull(),

  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.6 `section_content_items` — Leaf Content inside Sections

```typescript
export const sectionContentItems = pgTable('section_content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id')
    .references(() => courseSections.id, { onDelete: 'cascade' })
    .notNull(),

  title: text('title').notNull(),
  description: text('description'),
  type: contentItemTypeEnum('type').notNull(),  // VIDEO|PDF|DOCUMENT|URL|TEXT
  orderIndex: integer('order_index').notNull(),

  // TEXT or URL: stored in content
  content: text('content'),

  // VIDEO, PDF, DOCUMENT: stored in file fields
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  duration: integer('duration_seconds'),  // for VIDEO only

  isPreview: boolean('is_preview').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.7 Relations

```typescript
// mentor_content → mentor (many:1), course (1:1 optional)
export const mentorContentRelations = relations(mentorContent, ({ one }) => ({
  mentor: one(mentors, {
    fields: [mentorContent.mentorId],
    references: [mentors.id],
  }),
  course: one(courses, {
    fields: [mentorContent.id],
    references: [courses.contentId],
  }),
}));

// courses → mentorContent (1:1), modules (1:many)
export const coursesRelations = relations(courses, ({ one, many }) => ({
  content: one(mentorContent, {
    fields: [courses.contentId],
    references: [mentorContent.id],
  }),
  modules: many(courseModules),
}));

// courseModules → course (many:1), sections (1:many)
export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
  sections: many(courseSections),
}));

// courseSections → module (many:1), contentItems (1:many)
export const courseSectionsRelations = relations(courseSections, ({ one, many }) => ({
  module: one(courseModules, {
    fields: [courseSections.moduleId],
    references: [courseModules.id],
  }),
  contentItems: many(sectionContentItems),
}));

// sectionContentItems → section (many:1)
export const sectionContentItemsRelations = relations(sectionContentItems, ({ one }) => ({
  section: one(courseSections, {
    fields: [sectionContentItems.sectionId],
    references: [courseSections.id],
  }),
}));
```

### 3.8 Type Exports

```typescript
export type MentorContent = typeof mentorContent.$inferSelect;
export type NewMentorContent = typeof mentorContent.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseModule = typeof courseModules.$inferSelect;
export type NewCourseModule = typeof courseModules.$inferInsert;
export type CourseSection = typeof courseSections.$inferSelect;
export type NewCourseSection = typeof courseSections.$inferInsert;
export type SectionContentItem = typeof sectionContentItems.$inferSelect;
export type NewSectionContentItem = typeof sectionContentItems.$inferInsert;

export type ContentType = typeof contentTypeEnum.enumValues[number];      // 'COURSE'|'FILE'|'URL'
export type ContentItemType = typeof contentItemTypeEnum.enumValues[number]; // 'VIDEO'|'PDF'|...
export type CourseDifficulty = typeof courseDifficultyEnum.enumValues[number];
export type ContentStatus = typeof contentStatusEnum.enumValues[number];
```

---

## 4. API Endpoints Reference

All routes use session-based auth via `auth.api.getSession()`. The mentor is looked up by `mentors.userId = session.user.id`. Auth pattern is consistent across all routes:

```typescript
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const mentor = await db.select().from(mentors).where(eq(mentors.userId, session.user.id)).limit(1);
if (!mentor.length) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
```

---

### 4.1 Content List

#### `GET /api/mentors/content`

Returns all content for the authenticated mentor, ordered by `createdAt`.

- **Auth**: Session required
- **Response** (200): Array of `MentorContent` objects

```json
[
  {
    "id": "uuid",
    "title": "Introduction to Python",
    "description": "...",
    "type": "COURSE",
    "status": "PUBLISHED",
    "fileUrl": null,
    "fileName": null,
    "fileSize": null,
    "mimeType": null,
    "url": null,
    "urlTitle": null,
    "urlDescription": null,
    "createdAt": "2024-03-15T10:00:00.000Z",
    "updatedAt": "2024-03-15T10:00:00.000Z"
  }
]
```

#### `POST /api/mentors/content`

Creates a new content item.

- **Auth**: Session required
- **Zod Schema**:

```typescript
const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['COURSE', 'FILE', 'URL']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),

  // FILE type
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),

  // URL type
  url: z.string().url().optional(),
  urlTitle: z.string().optional(),
  urlDescription: z.string().optional(),
});
```

- **Type-specific validations** (extra checks after Zod):
  - `FILE` type without `fileUrl` → 400
  - `URL` type without `url` → 400
- **Response** (201): Created `MentorContent` row

---

### 4.2 Single Content Item

#### `GET /api/mentors/content/[id]`

Fetches a single content item. If type is `COURSE`, returns the full nested structure.

- **Auth**: Session required; must own the content
- **Response** (200):
  - For `FILE`/`URL` types: `MentorContent` object
  - For `COURSE` type: `MentorContent` + nested `course` with full `modules → sections → contentItems` tree

```json
{
  "id": "uuid",
  "title": "Python Course",
  "type": "COURSE",
  "status": "PUBLISHED",
  "course": {
    "id": "uuid",
    "difficulty": "BEGINNER",
    "category": "Programming",
    "price": "29.99",
    "currency": "USD",
    "tags": "[\"python\",\"beginner\"]",
    "learningOutcomes": "[\"Understand Python basics\"]",
    "enrollmentCount": 5,
    "modules": [
      {
        "id": "uuid",
        "title": "Getting Started",
        "orderIndex": 0,
        "sections": [
          {
            "id": "uuid",
            "title": "Introduction",
            "orderIndex": 0,
            "contentItems": [
              {
                "id": "uuid",
                "title": "Welcome Video",
                "type": "VIDEO",
                "fileUrl": "https://...",
                "duration": 300,
                "isPreview": true,
                "orderIndex": 0
              }
            ]
          }
        ]
      }
    ]
  }
}
```

#### `PUT /api/mentors/content/[id]`

Updates content metadata. Does not change the `type`.

- **Auth**: Session required; must own the content
- **Zod Schema** (all fields optional):

```typescript
const updateContentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  url: z.string().refine((val) => !val || val === '' || /^https?:\/\/.+/.test(val), {
    message: 'Invalid URL format'
  }).optional(),
  urlTitle: z.string().optional(),
  urlDescription: z.string().optional(),
});
```

- **Response** (200): Updated `MentorContent` row

#### `DELETE /api/mentors/content/[id]`

Deletes content. Cascade deletes the `courses` row and all its modules/sections/items automatically (via DB `onDelete: 'cascade'`).

- **Auth**: Session required; must own the content
- **Response** (200): `{ message: 'Content deleted successfully' }`

---

### 4.3 Course Setup

#### `POST /api/mentors/content/[id]/course`

Creates the `courses` row for a `COURSE`-type content. Must be called after creating the content item.

- **Auth**: Session required; must own the content; content must be type `COURSE`; returns 400 if course already exists
- **Zod Schema**:

```typescript
const createCourseSchema = z.object({
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().min(1).optional(),
  price: z.string().optional(),
  currency: z.string().default('USD'),
  thumbnailUrl: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learningOutcomes: z.array(z.string()).min(1, 'At least one learning outcome is required'),
  // The following are accepted but NOT stored (not in DB yet):
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  maxStudents: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  certificateTemplate: z.string().optional(),
});
```

- **DB Write**: `tags`, `prerequisites`, `learningOutcomes` → `JSON.stringify([...])`
- **Response** (201): Created `Course` row

#### `PUT /api/mentors/content/[id]/course`

Updates the course metadata. Same schema but all fields optional (`updateCourseSchema = createCourseSchema.partial()`).

- **Response** (200): Updated `Course` row

---

### 4.4 Modules

#### `GET /api/mentors/content/[id]/course/modules`
Lists all modules for a course, ordered by `orderIndex`.

#### `POST /api/mentors/content/[id]/course/modules`

Creates a module. Schema:

```typescript
const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
});
```

- **Response** (201): Created `CourseModule` row

#### `PUT /api/mentors/content/[id]/course/modules/[moduleId]`

Updates a module (commonly used for reordering — just sends `{ orderIndex: N }`).

#### `DELETE /api/mentors/content/[id]/course/modules/[moduleId]`

Deletes a module. Cascades to sections and content items.

---

### 4.5 Sections

#### `GET /api/mentors/content/modules/[moduleId]/sections`
#### `POST /api/mentors/content/modules/[moduleId]/sections`

Creates a section. Schema:

```typescript
z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
})
```

#### `PUT /api/mentors/content/modules/[moduleId]/sections/[sectionId]`
#### `DELETE /api/mentors/content/modules/[moduleId]/sections/[sectionId]`

---

### 4.6 Section Content Items

#### `GET /api/mentors/content/sections/[sectionId]/content-items`

Returns all items for a section ordered by `orderIndex`. Verifies section ownership via a 4-table join:
`course_sections → course_modules → courses → mentor_content` (checking `mentorId`).

#### `POST /api/mentors/content/sections/[sectionId]/content-items`

Creates a content item. Schema:

```typescript
const createContentItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['VIDEO', 'PDF', 'DOCUMENT', 'URL', 'TEXT']),
  orderIndex: z.number().min(0),
  content: z.string().optional(),    // for TEXT (body) and URL (the link)
  fileUrl: z.string().optional(),    // for VIDEO, PDF, DOCUMENT
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  duration: z.number().optional(),   // for VIDEO (seconds)
  isPreview: z.boolean().default(false),
});
```

- **Type-specific validations**:
  - `TEXT` without `content` → 400
  - `VIDEO`/`PDF`/`DOCUMENT` without `fileUrl` → 400
  - `URL` without `content` → 400 (the URL goes in the `content` field)
- **Response** (201): Created `SectionContentItem`

#### `PUT /api/mentors/content/sections/[sectionId]/content-items/[itemId]`
#### `DELETE /api/mentors/content/sections/[sectionId]/content-items/[itemId]`

---

### 4.7 File Upload

**File**: `app/api/upload/route.ts`

#### `POST /api/upload`

Uploads a file to **Supabase Storage**.

- **Auth**: Session required
- **Request**: `multipart/form-data` with fields:
  - `file` (binary)
  - `type` (string, default `'content'`) — used as path segment
- **Constraints**:
  - Max size: **100 MB**
  - Allowed MIME types: `video/mp4`, `video/webm`, `video/quicktime`, `video/avi`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `text/plain`
- **Storage path**: `mentors/content/{type}/{userId}-{timestamp}-{cleanedFilename}`
- **Fallback**: If MIME type upload fails, retries with `application/octet-stream`
- **Response** (201):

```json
{
  "success": true,
  "fileUrl": "https://your-supabase-project.supabase.co/storage/v1/object/public/...",
  "fileName": "original-name.pdf",
  "fileSize": 2048576,
  "mimeType": "application/pdf",
  "originalName": "original-name.pdf",
  "storagePath": "mentors/content/content/uid-1234567-original-name.pdf"
}
```

You need `lib/storage.ts` that wraps the Supabase client with a `.upload(file, path, options)` method.

---

## 5. Frontend Components

### 5.1 Component Tree

```
MentorContent                              (orchestrator)
├── Tabs: All / Courses / Files / URLs
├── ContentCard × N                        (memoized)
│   └── DropdownMenu: Edit, Manage Course, Delete
├── CreateContentDialog                    (multi-step wizard, mounted on demand)
├── EditContentDialog                      (mounted when editingContent !== null)
└── CourseBuilder                          (full-page replacement when courseBuilderContent !== null)
    ├── CreateCourseDialog
    ├── CreateModuleDialog
    ├── CreateSectionDialog
    ├── CreateContentItemDialog
    ├── EditItemDialog
    └── ReorderableModules
```

---

### 5.2 `MentorContent` — Orchestrator

**File**: `components/mentor/content/content.tsx` (338 lines)

**Key State**:

```typescript
const [createDialogOpen, setCreateDialogOpen] = useState(false);
const [editingContent, setEditingContent] = useState<ContentType | null>(null);
const [courseBuilderContent, setCourseBuilderContent] = useState<ContentType | null>(null);
const [activeTab, setActiveTab] = useState('all');
```

**Data Fetching**:
- `useContentList()` → fetches all content via `GET /api/mentors/content`
- `useDeleteContent()` → fires `DELETE /api/mentors/content/[id]`

**Filtering (client-side)**: `filteredContent` computed from `activeTab`:

```typescript
const filteredContent = useMemo(() => {
  return content.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab.toUpperCase();
  });
}, [content, activeTab]);
```

**Tab counts**: `{ all: N, course: N, file: N, url: N }` — computed with `useMemo`.

**Routing inside component**:
- `courseBuilderContent !== null` → renders `<CourseBuilder>` (full replacement)
- Otherwise → renders the tab grid of `ContentCard`s

**Performance pattern**: All event handlers (`handleEdit`, `handleDelete`, `handleOpenCourse`, etc.) are wrapped in `useCallback`. `ContentCard` is `memo()`-wrapped to avoid re-renders.

---

### 5.3 `ContentCard` — Individual Card (memoized)

**Props**:

```typescript
interface ContentCardProps {
  content: MentorContent;
  onEdit: (content: MentorContent) => void;
  onDelete: (id: string) => void;
  onOpenCourse: (content: MentorContent) => void;
}
```

**Displays**:
- Title + description (truncated to 100 chars)
- Status badge (color-coded) + type badge
- Relative time (`formatDistanceToNow` from `date-fns`)
- For `FILE`: filename + size in MB
- For `URL`: clickable link (uses `urlTitle` or raw URL)
- `DropdownMenu` (hover-revealed): Edit / Manage Course (COURSE only) / Delete

**Badge color map**:

| Status | CSS classes |
|---|---|
| `PUBLISHED` | `bg-green-100 text-green-800` |
| `DRAFT` | `bg-yellow-100 text-yellow-800` |
| `ARCHIVED` | `bg-gray-100 text-gray-800` |

---

### 5.4 `CreateContentDialog` — Multi-Step Creation Wizard

**File**: `components/mentor/content/create-content-dialog.tsx` (744 lines)

**Props**:

```typescript
interface CreateContentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
}
```

**State**:

```typescript
const [step, setStep] = useState(1);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [dragActive, setDragActive] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
```

**Step logic by type**:

| Content Type | Total Steps | Step 1 | Step 2 | Step 3 |
|---|---|---|---|---|
| `COURSE` | 2 | Type selection + title | Review & publish | — |
| `FILE` | 3 | Type selection + title | Upload file | Review & publish |
| `URL` | 3 | Type selection + title | URL + display title/description | Review & publish |

**Step validation per type**:

```typescript
// Step 1: title + type must be present
// Step 2 FILE: selectedFile must exist
// Step 2 URL: url must be a valid URL (z.string().url().parse)
// Step 3: all fields must be valid for type
```

**Submit flow** (`onSubmit`):

1. Uses `form.getValues()` for the latest values
2. Validates with the appropriate Zod schema per type
3. If `FILE`: calls `uploadFileMutation.mutateAsync({ file, type: 'content' })` → `POST /api/upload`
4. Calls `createContentMutation.mutateAsync(finalData)` → `POST /api/mentors/content`
5. Updates progress bar (10% → 70% → 90% → 100%)

**Hooks used**: `useCreateContent()`, `useUploadFile()`

---

### 5.5 `EditContentDialog` — Tabbed Editor

**File**: `components/mentor/content/edit-content-dialog.tsx` (609 lines)

**Props**:

```typescript
interface EditContentDialogProps {
  content: MentorContent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Three tabs**:

| Tab | Content | Notes |
|---|---|---|
| Content Details | Title, description, status selector | Also shows URL fields if type is `URL` |
| File Management / URL Settings | File replacement (drag & drop) or URL editing | Disabled for `COURSE` type |
| Analytics | Placeholder cards (Views, Engagements, Performance) | "Coming soon" |

**Auto-save**: `form.watch()` triggers a 2-second debounced save on any field change:

```typescript
useEffect(() => {
  const subscription = form.watch((value, { name }) => {
    if (name && !isAutoSaving) {
      const timeoutId = setTimeout(() => {
        handleAutoSave(value as EditFormData);
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  });
  return () => subscription.unsubscribe();
}, [form.watch, isAutoSaving]);
```

Auto-save silently calls `PUT /api/mentors/content/[id]`. Shown to user as a small "Auto-saving..." indicator.

**Manual save button** also calls `PUT /api/mentors/content/[id]`, with file replacement handled through `POST /api/upload` first.

---

### 5.6 `CourseBuilder` — Full-Screen Course Manager

**File**: `components/mentor/content/course-builder.tsx` (384 lines)

**Props**:

```typescript
interface CourseBuilderProps {
  content: MentorContent;
  onBack: () => void;
}
```

**Data Fetching**: `useContent(content.id)` — fetches full nested structure (`GET /api/mentors/content/[id]` returns `course.modules[].sections[].contentItems[]`).

**Two tabs**:

1. **Course Structure** — `ReorderableModules` component shows accordion list:
   - Module → Section → ContentItem
   - Actions per level: Edit, Delete, Add Child
   - Drag-to-reorder modules: calls `PUT /api/mentors/content/[id]/course/modules/[modId]` for each affected module with new `orderIndex`

2. **Course Details** — Read-only summary of difficulty, category, duration, price, tags, learningOutcomes

**Sub-dialogs**:

| Dialog | Opens when | API called |
|---|---|---|
| `CreateCourseDialog` | No `courses` row yet, or editing course details | `POST /api/mentors/content/[id]/course` |
| `CreateModuleDialog` | + Add Module button | `POST /api/mentors/content/[id]/course/modules` |
| `CreateSectionDialog` | + Add Section per module | `POST /api/mentors/content/modules/[modId]/sections` |
| `CreateContentItemDialog` | + Add Item per section | `POST /api/mentors/content/sections/[secId]/content-items` |
| `EditItemDialog` | Edit icon on any item | `PUT` on respective endpoint |

**Delete handler** (direct `fetch`, not React Query mutation):

```typescript
const handleDelete = async (type: 'module' | 'section' | 'contentItem', data: any) => {
  let endpoint = '';
  if (type === 'module')       endpoint = `/api/mentors/content/${content.id}/course/modules/${data.id}`;
  if (type === 'section')      endpoint = `/api/mentors/content/modules/${data.moduleId}/sections/${data.id}`;
  if (type === 'contentItem')  endpoint = `/api/mentors/content/sections/${data.sectionId}/content-items/${data.id}`;
  await fetch(endpoint, { method: 'DELETE' });
  queryClient.invalidateQueries({ queryKey: ['mentor-content', content.id] });
};
```

---

## 6. React Query Hooks

**File**: `hooks/queries/use-content-queries.ts` (257 lines)

| Hook | Method | Endpoint | Query Key |
|---|---|---|---|
| `useContentList()` | GET | `/api/mentors/content` | `['mentor-content']` |
| `useContent(contentId)` | GET | `/api/mentors/content/${contentId}` | `['mentor-content', contentId]` |
| `useCreateContent()` | POST | `/api/mentors/content` | Invalidates `['mentor-content']` |
| `useUpdateContent()` | PUT | `/api/mentors/content/${id}` | Invalidates both keys |
| `useDeleteContent()` | DELETE | `/api/mentors/content/${id}` | Invalidates `['mentor-content']` |
| `useCreateCourse()` | POST | `/api/mentors/content/${contentId}/course` | Invalidates `['mentor-content', contentId]` |
| `useUploadFile()` | POST | `/api/upload` (multipart) | No cache key |

**TypeScript interfaces exported** from the hooks file:

```typescript
export interface MentorContent {
  id: string; title: string; description?: string;
  type: 'COURSE' | 'FILE' | 'URL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fileUrl?: string; fileName?: string; fileSize?: number; mimeType?: string;
  url?: string; urlTitle?: string; urlDescription?: string;
  createdAt: string; updatedAt: string;
}

export interface Course {
  id: string; contentId: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration?: number; price?: string; currency: string;
  thumbnailUrl?: string; category?: string;
  tags?: string[]; prerequisites?: string[]; learningOutcomes?: string[];
  enrollmentCount: number; createdAt: string; updatedAt: string;
}

export interface CourseModule {
  id: string; courseId: string; title: string;
  description?: string; orderIndex: number;
  createdAt: string; updatedAt: string;
}

export interface CourseSection {
  id: string; moduleId: string; title: string;
  description?: string; orderIndex: number;
  contentItems?: ContentItem[];
  createdAt: string; updatedAt: string;
}

export interface ContentItem {
  id: string; sectionId: string; title: string;
  description?: string; type: 'VIDEO' | 'PDF' | 'DOCUMENT' | 'URL' | 'TEXT';
  orderIndex: number; content?: string;
  fileUrl?: string; fileName?: string; fileSize?: number;
  mimeType?: string; duration?: number; isPreview: boolean;
  createdAt: string; updatedAt: string;
}
```

---

## 7. File Upload Pipeline

```
CreateContentDialog / EditContentDialog
    ↓ selectedFile (File object from <input> or drag-drop)
    ↓ useUploadFile().mutateAsync({ file, type: 'content' })
    ↓ POST /api/upload (multipart/form-data)
        ├── Validate: size ≤ 100MB, MIME in allowed list
        ├── Generate path: mentors/content/{type}/{userId}-{timestamp}-{cleanFilename}
        ├── storage.upload(file, path, { public: true })
        │   └── Uses Supabase Storage client (lib/storage.ts)
        └── Returns: { fileUrl, fileName, fileSize, mimeType, originalName, storagePath }
    ↓ Returned { fileUrl, fileName, fileSize, mimeType } used in POST/PUT /api/mentors/content
```

**`lib/storage.ts`** must provide:

```typescript
export const storage = {
  upload: async (
    file: File,
    path: string,
    options: { maxSize?: number; allowedTypes?: string[]; public?: boolean; contentType?: string }
  ): Promise<{ url: string; path: string }> => { ... }
};
```

This wraps the Supabase JS client's `storage.from('bucket').upload()`.

---

## 8. Data-Flow Walkthroughs

### 8.1 Initial Page Load

```
1. MentorContent mounts
2. useContentList() → GET /api/mentors/content
3. Returns [] or [MentorContent, ...]
4. filteredContent and tabCounts computed via useMemo
5. Renders ContentCard grid
```

### 8.2 Creating a FILE Content Item

```
1. User clicks "Create Content"
2. CreateContentDialog opens (step=1)
3. User selects "File" type, enters title → clicks Next (step=2)
4. User uploads a file (drag-drop or file picker) → selectedFile set
5. User clicks Next (step=3) → Review & Publish
6. User sets status (DRAFT/PUBLISHED) → clicks "Create Content"
7. onSubmit():
   a. Calls POST /api/upload → gets { fileUrl, fileName, fileSize, mimeType }
   b. Calls POST /api/mentors/content with { title, type:'FILE', status, fileUrl, fileName, fileSize, mimeType }
8. useContentList query invalidated → grid re-fetches
```

### 8.3 Creating a COURSE

```
1. User creates content with type=COURSE → POST /api/mentors/content
   Response: { id: "content-uuid", type: "COURSE", ... }
2. User clicks "Manage Course" on the card
3. MentorContent sets courseBuilderContent → renders CourseBuilder
4. CourseBuilder fetches GET /api/mentors/content/[contentId] → course is null
5. User clicks "Setup Course Details" → CreateCourseDialog opens
6. User fills difficulty, category, learningOutcomes, optional price
7. useCreateCourse() → POST /api/mentors/content/[contentId]/course
8. CourseBuilder re-fetches → now has course row with no modules
9. User clicks "+ Add Module" → CreateModuleDialog
10. POST /api/mentors/content/[contentId]/course/modules
11. Module appears → user clicks "+ Add Section" → CreateSectionDialog
12. POST /api/mentors/content/modules/[moduleId]/sections
13. Section appears → user clicks "+ Add Item" → CreateContentItemDialog
14. If VIDEO/PDF/DOCUMENT: uploads file first via POST /api/upload
15. POST /api/mentors/content/sections/[sectionId]/content-items
16. Item appears in the accordion
```

### 8.4 Editing Content

```
1. User hovers card → clicks ⋮ → "Edit"
2. editingContent set → EditContentDialog opens
3. form pre-filled with current values
4. User changes title → auto-save fires after 2 seconds
   → PUT /api/mentors/content/[id] (silent)
5. User clicks "Save Changes" → PUT /api/mentors/content/[id] (explicit)
6. Both content list and single content queries invalidated
```

### 8.5 Reordering Modules

```
1. User drags a module in ReorderableModules
2. handleReorderModules(newOrder) called
3. For each module at new index:
   PUT /api/mentors/content/[contentId]/course/modules/[moduleId]
   body: { orderIndex: newIndex }
4. All requests run in parallel (Promise.all)
5. queryClient.invalidateQueries({ queryKey: ['mentor-content', contentId] })
```

---

## 9. Dependencies

### NPM Packages

| Package | Usage |
|---|---|
| `next` | Framework (App Router) |
| `drizzle-orm` + `drizzle-orm/pg-core` | Database ORM |
| `zod` | Request validation |
| `@tanstack/react-query` | Client-side data fetching and caching |
| `react-hook-form` | Form state management |
| `@hookform/resolvers/zod` | Zod integration for react-hook-form |
| `date-fns` | `formatDistanceToNow` for relative timestamps |
| `sonner` | Toast notifications |
| `lucide-react` | Icons |
| `@supabase/supabase-js` | Supabase Storage client (in `lib/storage.ts`) |

### Shadcn/UI Components Used

- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`
- `Button`, `Badge`
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Input`, `Textarea`, `Label`
- `Form`, `FormControl`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`, `FormDescription`
- `Progress`
- `Accordion`, `AccordionContent`, `AccordionItem`, `AccordionTrigger`
- `Separator`

---

## 10. Implementation Checklist

### Phase 1: Database

- [ ] Create 4 enums: `content_type`, `content_item_type`, `course_difficulty`, `content_status`
- [ ] Create `mentor_content` table
- [ ] Create `courses` table (`contentId` unique FK with cascade)
- [ ] Create `course_modules` table
- [ ] Create `course_sections` table
- [ ] Create `section_content_items` table
- [ ] Define relations and export types
- [ ] Add to `lib/db/schema/index.ts` exports
- [ ] Run `db:push` or `db:migrate`

### Phase 2: Storage

- [ ] Set up Supabase project and bucket (public read, auth write)
- [ ] Create `lib/storage.ts` wrapping Supabase `.storage.from('bucket').upload()`
- [ ] Create `app/api/upload/route.ts` (POST handler, 100MB limit, MIME validation)

### Phase 3: API Routes

- [ ] `GET + POST /api/mentors/content`
- [ ] `GET + PUT + DELETE /api/mentors/content/[id]`
- [ ] `POST + PUT /api/mentors/content/[id]/course`
- [ ] `GET + POST /api/mentors/content/[id]/course/modules`
- [ ] `PUT + DELETE /api/mentors/content/[id]/course/modules/[moduleId]`
- [ ] `GET + POST /api/mentors/content/modules/[moduleId]/sections`
- [ ] `PUT + DELETE /api/mentors/content/modules/[moduleId]/sections/[sectionId]`
- [ ] `GET + POST /api/mentors/content/sections/[sectionId]/content-items`
- [ ] `PUT + DELETE /api/mentors/content/sections/[sectionId]/content-items/[itemId]`

### Phase 4: React Query Hooks

- [ ] Create `hooks/queries/use-content-queries.ts`
- [ ] Implement `useContentList`, `useContent`, `useCreateContent`, `useUpdateContent`, `useDeleteContent`
- [ ] Implement `useCreateCourse`
- [ ] Implement `useUploadFile`
- [ ] Export all TypeScript interfaces

### Phase 5: Frontend Components

- [ ] Create `MentorContent` orchestrator with tab filtering
- [ ] Create `ContentCard` (memo, with dropdown menu)
- [ ] Create `CreateContentDialog` (multi-step, per-type logic, file upload, progress bar)
- [ ] Create `EditContentDialog` (tabbed, auto-save, file replacement)
- [ ] Create `CourseBuilder` (full-page, 4 sub-dialogs, ReorderableModules)
- [ ] Create `CreateCourseDialog`, `CreateModuleDialog`, `CreateSectionDialog`, `CreateContentItemDialog`, `EditItemDialog`
- [ ] Create `ReorderableModules` (drag-and-drop reorder)
- [ ] Create `MentorContentErrorBoundary` + `useMentorContentErrorHandler` hook
- [ ] Create loading skeletons: `CourseStructureSkeleton`, `CourseDetailsSkeleton`
- [ ] Create `lib/utils/safe-json.ts` with `safeJsonParse()` utility

### Phase 6: Integration

- [ ] Add "My Content" to the mentor sidebar navigation
- [ ] Add `<MentorContent />` to the mentor dashboard page/route
- [ ] Test full flow: create COURSE → setup course → add module/section/item → publish
- [ ] Test FILE upload (large file, unsupported type rejection)
- [ ] Test URL creation and display
- [ ] Test auto-save in EditContentDialog
- [ ] Test delete cascade (confirm COURSE deletion removes all course data)
