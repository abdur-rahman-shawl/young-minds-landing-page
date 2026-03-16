import { pgTable, text, timestamp, boolean, integer, decimal, pgEnum, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mentors } from './mentors';
import { users } from './users';

// Content type enum
export const contentTypeEnum = pgEnum('content_type', [
  'COURSE',
  'FILE',
  'URL'
]);

// Content item type enum (for course content)
export const contentItemTypeEnum = pgEnum('content_item_type', [
  'VIDEO',
  'PDF',
  'DOCUMENT',
  'URL',
  'TEXT'
]);

// Course difficulty enum
export const courseDifficultyEnum = pgEnum('course_difficulty', [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED'
]);

// Course ownership enum
export const courseOwnerTypeEnum = pgEnum('course_owner_type', [
  'MENTOR',
  'PLATFORM'
]);

// Content status enum
export const contentStatusEnum = pgEnum('content_status', [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
  'FLAGGED'
]);

// Content review action enum
export const contentReviewActionEnum = pgEnum('content_review_action', [
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'RESUBMITTED',
  'ARCHIVED',
  'RESTORED',
  'FLAGGED',
  'UNFLAGGED',
  'FORCE_APPROVED',
  'FORCE_ARCHIVED',
  'APPROVAL_REVOKED',
  'FORCE_DELETED'
]);

// Main content table
export const mentorContent = pgTable('mentor_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id').references(() => mentors.id, { onDelete: 'cascade' }),
  
  // Basic info
  title: text('title').notNull(),
  description: text('description'),
  type: contentTypeEnum('type').notNull(),
  status: contentStatusEnum('status').default('DRAFT').notNull(),
  
  // For FILE type
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileSize: integer('file_size'), // in bytes
  mimeType: text('mime_type'),
  
  // For URL type
  url: text('url'),
  urlTitle: text('url_title'),
  urlDescription: text('url_description'),
  
  // Review workflow
  submittedForReviewAt: timestamp('submitted_for_review_at'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewNote: text('review_note'),
  
  // Flagging workflow
  flagReason: text('flag_reason'),
  flaggedAt: timestamp('flagged_at'),
  flaggedBy: text('flagged_by').references(() => users.id, { onDelete: 'set null' }),

  // Archive/restore support
  statusBeforeArchive: text('status_before_archive'),
  requireReviewAfterRestore: boolean('require_review_after_restore').default(false),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Courses table (for COURSE type content)
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => mentorContent.id, { onDelete: 'cascade' }).notNull().unique(),
  ownerType: courseOwnerTypeEnum('owner_type').default('MENTOR').notNull(),
  ownerId: uuid('owner_id').references(() => mentors.id, { onDelete: 'set null' }),
  
  // Course details
  difficulty: courseDifficultyEnum('difficulty').notNull(),
  duration: integer('duration_minutes'), // estimated duration in minutes
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  
  // Course metadata
  thumbnailUrl: text('thumbnail_url'),
  category: text('category'),
  tags: text('tags'), // JSON array of tags
  platformTags: text('platform_tags'), // JSON array of platform tags
  platformName: text('platform_name'),
  prerequisites: text('prerequisites'), // JSON array
  learningOutcomes: text('learning_outcomes'), // JSON array
  
  // Analytics
  enrollmentCount: integer('enrollment_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Course modules table
export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  learningObjectives: text('learning_objectives'), // JSON array of learning objectives
  estimatedDurationMinutes: integer('estimated_duration_minutes'), // estimated duration in minutes
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Course sections table (within modules)
export const courseSections = pgTable('course_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').references(() => courseModules.id, { onDelete: 'cascade' }).notNull(),
  
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Content items within sections
export const sectionContentItems = pgTable('section_content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id').references(() => courseSections.id, { onDelete: 'cascade' }).notNull(),
  
  title: text('title').notNull(),
  description: text('description'),
  type: contentItemTypeEnum('type').notNull(),
  orderIndex: integer('order_index').notNull(),
  
  // Content data based on type
  content: text('content'), // For TEXT type or URL
  fileUrl: text('file_url'), // For VIDEO, PDF, DOCUMENT
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  duration: integer('duration_seconds'), // For videos
  
  // Additional metadata
  isPreview: boolean('is_preview').default(false), // Can be viewed without enrollment
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Content review audit table — immutable log of every review action
export const contentReviewAudit = pgTable('content_review_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => mentorContent.id, { onDelete: 'cascade' }).notNull(),
  mentorId: uuid('mentor_id').references(() => mentors.id, { onDelete: 'cascade' }).notNull(),
  action: contentReviewActionEnum('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Mentor profile content selection — which approved content to show on public profile
export const mentorProfileContent = pgTable('mentor_profile_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id').references(() => mentors.id, { onDelete: 'cascade' }).notNull(),
  contentId: uuid('content_id').references(() => mentorContent.id, { onDelete: 'cascade' }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => ({
  uniqueMentorContent: unique().on(table.mentorId, table.contentId),
}));

// Relations
export const mentorContentRelations = relations(mentorContent, ({ one, many }) => ({
  mentor: one(mentors, {
    fields: [mentorContent.mentorId],
    references: [mentors.id],
  }),
  course: one(courses, {
    fields: [mentorContent.id],
    references: [courses.contentId],
  }),
  reviewer: one(users, {
    fields: [mentorContent.reviewedBy],
    references: [users.id],
  }),
  reviewAudits: many(contentReviewAudit),
  profileSelections: many(mentorProfileContent),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  content: one(mentorContent, {
    fields: [courses.contentId],
    references: [mentorContent.id],
  }),
  modules: many(courseModules),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
  sections: many(courseSections),
}));

export const courseSectionsRelations = relations(courseSections, ({ one, many }) => ({
  module: one(courseModules, {
    fields: [courseSections.moduleId],
    references: [courseModules.id],
  }),
  contentItems: many(sectionContentItems),
}));

export const sectionContentItemsRelations = relations(sectionContentItems, ({ one }) => ({
  section: one(courseSections, {
    fields: [sectionContentItems.sectionId],
    references: [courseSections.id],
  }),
}));

export const contentReviewAuditRelations = relations(contentReviewAudit, ({ one }) => ({
  content: one(mentorContent, {
    fields: [contentReviewAudit.contentId],
    references: [mentorContent.id],
  }),
  mentor: one(mentors, {
    fields: [contentReviewAudit.mentorId],
    references: [mentors.id],
  }),
  reviewer: one(users, {
    fields: [contentReviewAudit.reviewedBy],
    references: [users.id],
  }),
}));

export const mentorProfileContentRelations = relations(mentorProfileContent, ({ one }) => ({
  mentor: one(mentors, {
    fields: [mentorProfileContent.mentorId],
    references: [mentors.id],
  }),
  content: one(mentorContent, {
    fields: [mentorProfileContent.contentId],
    references: [mentorContent.id],
  }),
}));

// Type exports
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
export type ContentReviewAudit = typeof contentReviewAudit.$inferSelect;
export type NewContentReviewAudit = typeof contentReviewAudit.$inferInsert;
export type MentorProfileContent = typeof mentorProfileContent.$inferSelect;
export type NewMentorProfileContent = typeof mentorProfileContent.$inferInsert;

export type ContentType = typeof contentTypeEnum.enumValues[number];
export type ContentItemType = typeof contentItemTypeEnum.enumValues[number];
export type CourseDifficulty = typeof courseDifficultyEnum.enumValues[number];
export type CourseOwnerType = typeof courseOwnerTypeEnum.enumValues[number];
export type ContentStatus = typeof contentStatusEnum.enumValues[number];
export type ContentReviewAction = typeof contentReviewActionEnum.enumValues[number];
