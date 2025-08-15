CREATE TYPE "public"."achievement_type" AS ENUM('STREAK', 'COMPLETION', 'TIME_SPENT', 'CONSISTENCY', 'MILESTONE', 'SKILL_MASTERY');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'EXCEEDED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('LEARNING', 'REVIEW', 'PRACTICE', 'ASSESSMENT');--> statement-breakpoint
CREATE TABLE "ai_chatbot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_session_id" uuid NOT NULL,
	"user_id" text,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"weekly_learning_goal_hours" numeric(5, 2) DEFAULT '5.00',
	"preferred_learning_days" json DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::json,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"learning_reminders" json DEFAULT '{"enabled":true,"reminderTimes":["09:00","19:00"],"reminderDays":["monday","wednesday","friday"],"emailNotifications":true,"pushNotifications":true}'::json,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"streak_start_date" date,
	"last_active_date" date,
	"streak_freezes_used" integer DEFAULT 0 NOT NULL,
	"total_streak_freezes_available" integer DEFAULT 3 NOT NULL,
	"total_learning_hours" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"total_sessions_completed" integer DEFAULT 0 NOT NULL,
	"average_session_duration_minutes" numeric(6, 2) DEFAULT '0.00',
	"consistency_score" numeric(5, 2) DEFAULT '0.00',
	"most_active_day" text,
	"most_active_hour" integer,
	"learning_velocity_score" numeric(5, 2) DEFAULT '0.00',
	"learning_style" text,
	"motivation_type" text,
	"difficulty_preference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learner_profiles_mentee_id_unique" UNIQUE("mentee_id")
);
--> statement-breakpoint
CREATE TABLE "learning_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"achievement_type" "achievement_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	"badge_color" text DEFAULT '#3B82F6',
	"criteria_value" integer NOT NULL,
	"current_value" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"related_course_id" uuid,
	"related_enrollment_id" uuid,
	"points" integer DEFAULT 0 NOT NULL,
	"rarity" text DEFAULT 'common',
	"category" text,
	"earned_at" timestamp,
	"shared_at" timestamp,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"insight_type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_text" text,
	"action_url" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text,
	"based_on_data" json,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_acted_upon" boolean DEFAULT false NOT NULL,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"user_feedback" text,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_session_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"video_position_seconds" integer,
	"playback_speed" numeric(3, 2) DEFAULT '1.00',
	"volume_level" integer,
	"pause_count" integer DEFAULT 0 NOT NULL,
	"seek_count" integer DEFAULT 0 NOT NULL,
	"rewind_count" integer DEFAULT 0 NOT NULL,
	"completion_percentage" numeric(5, 2) DEFAULT '0.00',
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"session_type" "session_type" DEFAULT 'LEARNING' NOT NULL,
	"total_minutes_spent" integer DEFAULT 0 NOT NULL,
	"courses_accessed" json DEFAULT '[]'::json,
	"content_items_completed" integer DEFAULT 0 NOT NULL,
	"content_items_started" integer DEFAULT 0 NOT NULL,
	"videos_watched" integer DEFAULT 0 NOT NULL,
	"documents_read" integer DEFAULT 0 NOT NULL,
	"assessments_completed" integer DEFAULT 0 NOT NULL,
	"session_start_time" timestamp NOT NULL,
	"session_end_time" timestamp,
	"device_type" text,
	"browser_info" text,
	"ip_address" text,
	"focus_score" numeric(5, 2),
	"interaction_count" integer DEFAULT 0,
	"average_playback_speed" numeric(3, 2) DEFAULT '1.00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_learning_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"goal_hours" numeric(5, 2) NOT NULL,
	"actual_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"goal_status" "goal_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"days_active" integer DEFAULT 0 NOT NULL,
	"average_daily_minutes" numeric(6, 2) DEFAULT '0.00',
	"achieved_at" timestamp,
	"exceeded_at" timestamp,
	"final_score" numeric(5, 2),
	"goal_set_at" timestamp DEFAULT now() NOT NULL,
	"goal_adjusted_at" timestamp,
	"previous_goal_hours" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_enrollments" ALTER COLUMN "gift_from_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ai_chatbot_messages" ADD CONSTRAINT "ai_chatbot_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_achievements" ADD CONSTRAINT "learning_achievements_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_achievements" ADD CONSTRAINT "learning_achievements_related_course_id_courses_id_fk" FOREIGN KEY ("related_course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_achievements" ADD CONSTRAINT "learning_achievements_related_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("related_enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_insights" ADD CONSTRAINT "learning_insights_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_session_details" ADD CONSTRAINT "learning_session_details_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_session_details" ADD CONSTRAINT "learning_session_details_content_item_id_section_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."section_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_learning_goals" ADD CONSTRAINT "weekly_learning_goals_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_wishlist" DROP COLUMN "id";