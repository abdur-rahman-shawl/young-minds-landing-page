import { pgTable, text, timestamp, boolean, integer, decimal, pgEnum, uuid, date, primaryKey, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mentees } from './mentees';
import { courses, sectionContentItems } from './mentor-content';
import { courseEnrollments } from './course-enrollment';

// Goal status enum
export const goalStatusEnum = pgEnum('goal_status', [
  'NOT_STARTED',
  'IN_PROGRESS', 
  'ACHIEVED',
  'EXCEEDED',
  'MISSED'
]);

// Session type enum
export const sessionTypeEnum = pgEnum('session_type', [
  'LEARNING',
  'REVIEW',
  'PRACTICE',
  'ASSESSMENT'
]);

// Achievement type enum
export const achievementTypeEnum = pgEnum('achievement_type', [
  'STREAK',
  'COMPLETION',
  'TIME_SPENT',
  'CONSISTENCY',
  'MILESTONE',
  'SKILL_MASTERY'
]);

// Learner profiles - comprehensive learning preferences and statistics
export const learnerProfiles = pgTable('learner_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  menteeId: uuid('mentee_id').references(() => mentees.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Learning preferences
  weeklyLearningGoalHours: decimal('weekly_learning_goal_hours', { precision: 5, scale: 2 }).default('5.00'),
  preferredLearningDays: json('preferred_learning_days').$type<string[]>().default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  timezone: text('timezone').default('UTC').notNull(),
  learningReminders: json('learning_reminders').$type<{
    enabled: boolean;
    reminderTimes: string[]; // ['09:00', '14:00', '19:00']
    reminderDays: string[]; // ['monday', 'wednesday', 'friday']
    emailNotifications: boolean;
    pushNotifications: boolean;
  }>().default({
    enabled: true,
    reminderTimes: ['09:00', '19:00'],
    reminderDays: ['monday', 'wednesday', 'friday'],
    emailNotifications: true,
    pushNotifications: true
  }),
  
  // Streak tracking
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  streakStartDate: date('streak_start_date'),
  lastActiveDate: date('last_active_date'),
  streakFreezesUsed: integer('streak_freezes_used').default(0).notNull(), // Allow missed days
  totalStreakFreezesAvailable: integer('total_streak_freezes_available').default(3).notNull(),
  
  // Learning statistics
  totalLearningHours: decimal('total_learning_hours', { precision: 8, scale: 2 }).default('0.00').notNull(),
  totalSessionsCompleted: integer('total_sessions_completed').default(0).notNull(),
  averageSessionDurationMinutes: decimal('average_session_duration_minutes', { precision: 6, scale: 2 }).default('0.00'),
  consistencyScore: decimal('consistency_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100 score
  
  // Engagement metrics
  mostActiveDay: text('most_active_day'), // 'monday', 'tuesday', etc.
  mostActiveHour: integer('most_active_hour'), // 0-23
  learningVelocityScore: decimal('learning_velocity_score', { precision: 5, scale: 2 }).default('0.00'),
  
  // Personalization
  learningStyle: text('learning_style'), // 'visual', 'auditory', 'kinesthetic', 'reading'
  motivationType: text('motivation_type'), // 'achievement', 'social', 'mastery', 'autonomy'
  difficultyPreference: text('difficulty_preference'), // 'gradual', 'challenging', 'mixed'
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Learning sessions - daily learning activity tracking
export const learningSessions = pgTable('learning_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  menteeId: uuid('mentee_id').references(() => mentees.id, { onDelete: 'cascade' }).notNull(),
  
  // Session details
  sessionDate: date('session_date').notNull(),
  sessionType: sessionTypeEnum('session_type').default('LEARNING').notNull(),
  totalMinutesSpent: integer('total_minutes_spent').default(0).notNull(),
  
  // Activity tracking
  coursesAccessed: json('courses_accessed').$type<string[]>().default([]), // Array of course IDs
  contentItemsCompleted: integer('content_items_completed').default(0).notNull(),
  contentItemsStarted: integer('content_items_started').default(0).notNull(),
  videosWatched: integer('videos_watched').default(0).notNull(),
  documentsRead: integer('documents_read').default(0).notNull(),
  assessmentsCompleted: integer('assessments_completed').default(0).notNull(),
  
  // Session metadata
  sessionStartTime: timestamp('session_start_time').notNull(),
  sessionEndTime: timestamp('session_end_time'),
  deviceType: text('device_type'), // 'desktop', 'mobile', 'tablet'
  browserInfo: text('browser_info'),
  ipAddress: text('ip_address'),
  
  // Engagement metrics for this session
  focusScore: decimal('focus_score', { precision: 5, scale: 2 }), // Based on pause/play patterns
  interactionCount: integer('interaction_count').default(0), // Clicks, pauses, seeks, etc.
  averagePlaybackSpeed: decimal('average_playback_speed', { precision: 3, scale: 2 }).default('1.00'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Weekly learning goals - user-configurable weekly targets
export const weeklyLearningGoals = pgTable('weekly_learning_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  menteeId: uuid('mentee_id').references(() => mentees.id, { onDelete: 'cascade' }).notNull(),
  
  // Goal period
  weekStartDate: date('week_start_date').notNull(), // Monday of the week
  weekEndDate: date('week_end_date').notNull(), // Sunday of the week
  
  // Goal details
  goalHours: decimal('goal_hours', { precision: 5, scale: 2 }).notNull(),
  actualHours: decimal('actual_hours', { precision: 5, scale: 2 }).default('0.00').notNull(),
  goalStatus: goalStatusEnum('goal_status').default('NOT_STARTED').notNull(),
  
  // Progress tracking
  progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
  daysActive: integer('days_active').default(0).notNull(), // How many days user was active this week
  averageDailyMinutes: decimal('average_daily_minutes', { precision: 6, scale: 2 }).default('0.00'),
  
  // Goal achievement
  achievedAt: timestamp('achieved_at'),
  exceededAt: timestamp('exceeded_at'), // If they went beyond the goal
  finalScore: decimal('final_score', { precision: 5, scale: 2 }), // 0-100 score for the week
  
  // Contextual data
  goalSetAt: timestamp('goal_set_at').defaultNow().notNull(),
  goalAdjustedAt: timestamp('goal_adjusted_at'), // If user changed goal mid-week
  previousGoalHours: decimal('previous_goal_hours', { precision: 5, scale: 2 }), // For tracking changes
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Learning achievements - gamification and milestone tracking
export const learningAchievements = pgTable('learning_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  menteeId: uuid('mentee_id').references(() => mentees.id, { onDelete: 'cascade' }).notNull(),
  
  // Achievement details
  achievementType: achievementTypeEnum('achievement_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  iconUrl: text('icon_url'),
  badgeColor: text('badge_color').default('#3B82F6'), // Hex color
  
  // Achievement criteria
  criteriaValue: integer('criteria_value').notNull(), // e.g., 7 for "7-day streak"
  currentValue: integer('current_value').default(0).notNull(), // Current progress
  isCompleted: boolean('is_completed').default(false).notNull(),
  
  // Related data
  relatedCourseId: uuid('related_course_id').references(() => courses.id), // If achievement is course-specific
  relatedEnrollmentId: uuid('related_enrollment_id').references(() => courseEnrollments.id),
  
  // Achievement metadata
  points: integer('points').default(0).notNull(), // Gamification points
  rarity: text('rarity').default('common'), // 'common', 'rare', 'epic', 'legendary'
  category: text('category'), // 'consistency', 'speed', 'completion', 'expertise'
  
  // Completion tracking
  earnedAt: timestamp('earned_at'),
  sharedAt: timestamp('shared_at'), // When user shared the achievement
  isVisible: boolean('is_visible').default(true).notNull(), // Privacy setting
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Learning insights - AI-generated recommendations and insights
export const learningInsights = pgTable('learning_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  menteeId: uuid('mentee_id').references(() => mentees.id, { onDelete: 'cascade' }).notNull(),
  
  // Insight details
  insightType: text('insight_type').notNull(), // 'recommendation', 'warning', 'celebration', 'tip'
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionText: text('action_text'), // e.g., "Start Learning", "Adjust Goal"
  actionUrl: text('action_url'), // Where to go when user clicks action
  
  // Insight metadata
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'urgent'
  category: text('category'), // 'goal', 'streak', 'performance', 'content'
  basedOnData: json('based_on_data').$type<{
    dataPoints: string[];
    timeRange: string;
    confidence: number; // 0-100
  }>(),
  
  // User interaction
  isRead: boolean('is_read').default(false).notNull(),
  isActedUpon: boolean('is_acted_upon').default(false).notNull(),
  isDismissed: boolean('is_dismissed').default(false).notNull(),
  userFeedback: text('user_feedback'), // 'helpful', 'not_helpful', 'irrelevant'
  
  // Validity
  validUntil: timestamp('valid_until'), // Some insights expire
  isActive: boolean('is_active').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Learning session details - granular activity within sessions
export const learningSessionDetails = pgTable('learning_session_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => learningSessions.id, { onDelete: 'cascade' }).notNull(),
  contentItemId: uuid('content_item_id').references(() => sectionContentItems.id, { onDelete: 'cascade' }).notNull(),
  
  // Activity details
  activityType: text('activity_type').notNull(), // 'video_play', 'video_pause', 'video_complete', 'document_open', etc.
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationSeconds: integer('duration_seconds').default(0).notNull(),
  
  // Video-specific data
  videoPosition: integer('video_position_seconds'), // Where in the video
  playbackSpeed: decimal('playback_speed', { precision: 3, scale: 2 }).default('1.00'),
  volumeLevel: integer('volume_level'), // 0-100
  
  // Engagement metrics
  pauseCount: integer('pause_count').default(0).notNull(),
  seekCount: integer('seek_count').default(0).notNull(),
  rewindCount: integer('rewind_count').default(0).notNull(),
  
  // Completion tracking
  completionPercentage: decimal('completion_percentage', { precision: 5, scale: 2 }).default('0.00'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const learnerProfilesRelations = relations(learnerProfiles, ({ one, many }) => ({
  mentee: one(mentees, {
    fields: [learnerProfiles.menteeId],
    references: [mentees.id],
  }),
  sessions: many(learningSessions),
  weeklyGoals: many(weeklyLearningGoals),
  achievements: many(learningAchievements),
  insights: many(learningInsights),
}));

export const learningSessionsRelations = relations(learningSessions, ({ one, many }) => ({
  mentee: one(mentees, {
    fields: [learningSessions.menteeId],
    references: [mentees.id],
  }),
  profile: one(learnerProfiles, {
    fields: [learningSessions.menteeId],
    references: [learnerProfiles.menteeId],
  }),
  sessionDetails: many(learningSessionDetails),
}));

export const weeklyLearningGoalsRelations = relations(weeklyLearningGoals, ({ one }) => ({
  mentee: one(mentees, {
    fields: [weeklyLearningGoals.menteeId],
    references: [mentees.id],
  }),
  profile: one(learnerProfiles, {
    fields: [weeklyLearningGoals.menteeId],
    references: [learnerProfiles.menteeId],
  }),
}));

export const learningAchievementsRelations = relations(learningAchievements, ({ one }) => ({
  mentee: one(mentees, {
    fields: [learningAchievements.menteeId],
    references: [mentees.id],
  }),
  profile: one(learnerProfiles, {
    fields: [learningAchievements.menteeId],
    references: [learnerProfiles.menteeId],
  }),
  relatedCourse: one(courses, {
    fields: [learningAchievements.relatedCourseId],
    references: [courses.id],
  }),
  relatedEnrollment: one(courseEnrollments, {
    fields: [learningAchievements.relatedEnrollmentId],
    references: [courseEnrollments.id],
  }),
}));

export const learningInsightsRelations = relations(learningInsights, ({ one }) => ({
  mentee: one(mentees, {
    fields: [learningInsights.menteeId],
    references: [mentees.id],
  }),
  profile: one(learnerProfiles, {
    fields: [learningInsights.menteeId],
    references: [learnerProfiles.menteeId],
  }),
}));

export const learningSessionDetailsRelations = relations(learningSessionDetails, ({ one }) => ({
  session: one(learningSessions, {
    fields: [learningSessionDetails.sessionId],
    references: [learningSessions.id],
  }),
  contentItem: one(sectionContentItems, {
    fields: [learningSessionDetails.contentItemId],
    references: [sectionContentItems.id],
  }),
}));

// Export types
export type LearnerProfile = typeof learnerProfiles.$inferSelect;
export type NewLearnerProfile = typeof learnerProfiles.$inferInsert;
export type LearningSession = typeof learningSessions.$inferSelect;
export type NewLearningSession = typeof learningSessions.$inferInsert;
export type WeeklyLearningGoal = typeof weeklyLearningGoals.$inferSelect;
export type NewWeeklyLearningGoal = typeof weeklyLearningGoals.$inferInsert;
export type LearningAchievement = typeof learningAchievements.$inferSelect;
export type NewLearningAchievement = typeof learningAchievements.$inferInsert;
export type LearningInsight = typeof learningInsights.$inferSelect;
export type NewLearningInsight = typeof learningInsights.$inferInsert;
export type LearningSessionDetail = typeof learningSessionDetails.$inferSelect;
export type NewLearningSessionDetail = typeof learningSessionDetails.$inferInsert;