CREATE TYPE "public"."availability_type" AS ENUM('AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."recurrence_pattern" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "availability_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"configuration" jsonb NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"type" "availability_type" DEFAULT 'BLOCKED' NOT NULL,
	"reason" text,
	"is_full_day" boolean DEFAULT true NOT NULL,
	"time_blocks" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_availability_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"default_session_duration" integer DEFAULT 60 NOT NULL,
	"buffer_time" integer DEFAULT 15 NOT NULL,
	"min_advance_booking_hours" integer DEFAULT 24 NOT NULL,
	"max_advance_booking_days" integer DEFAULT 90 NOT NULL,
	"default_start_time" time DEFAULT '09:00:00',
	"default_end_time" time DEFAULT '17:00:00',
	"is_active" boolean DEFAULT true NOT NULL,
	"allow_instant_booking" boolean DEFAULT true NOT NULL,
	"require_confirmation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_availability_schedules_mentor_id_unique" UNIQUE("mentor_id")
);
--> statement-breakpoint
CREATE TABLE "mentor_weekly_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"time_blocks" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_templates" ADD CONSTRAINT "availability_templates_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_availability_exceptions" ADD CONSTRAINT "mentor_availability_exceptions_schedule_id_mentor_availability_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."mentor_availability_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_availability_rules" ADD CONSTRAINT "mentor_availability_rules_schedule_id_mentor_availability_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."mentor_availability_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_availability_schedules" ADD CONSTRAINT "mentor_availability_schedules_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_weekly_patterns" ADD CONSTRAINT "mentor_weekly_patterns_schedule_id_mentor_availability_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."mentor_availability_schedules"("id") ON DELETE cascade ON UPDATE no action;