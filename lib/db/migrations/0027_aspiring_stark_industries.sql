CREATE TYPE "public"."mentor_form_submission_type" AS ENUM('CREATE', 'UPDATE');--> statement-breakpoint
ALTER TYPE "public"."verification_status" ADD VALUE 'RESUBMITTED';--> statement-breakpoint
ALTER TYPE "public"."verification_status" ADD VALUE 'UPDATED_PROFILE';--> statement-breakpoint
CREATE TABLE "admin_audit_trail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text,
	"action" text NOT NULL,
	"target_id" text,
	"target_type" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chatbot_question_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"user_id" text,
	"category" text DEFAULT 'question' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentors_form_audit_trail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"submission_type" "mentor_form_submission_type" DEFAULT 'CREATE' NOT NULL,
	"verification_status" "verification_status" NOT NULL,
	"form_data" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentors_profile_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"previous_data" jsonb NOT NULL,
	"updated_data" jsonb NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentees_profile_audit" (
	"audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"old_profile_data" jsonb,
	"new_profile_data" jsonb NOT NULL,
	"source_of_change" text
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "recording_config" jsonb DEFAULT '{"enabled":true,"resolution":"1280x720","fps":30}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_trail" ADD CONSTRAINT "admin_audit_trail_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chatbot_question_logs" ADD CONSTRAINT "ai_chatbot_question_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors_form_audit_trail" ADD CONSTRAINT "mentors_form_audit_trail_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors_form_audit_trail" ADD CONSTRAINT "mentors_form_audit_trail_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors_profile_audit" ADD CONSTRAINT "mentors_profile_audit_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors_profile_audit" ADD CONSTRAINT "mentors_profile_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentees_profile_audit" ADD CONSTRAINT "mentees_profile_audit_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentees_profile_audit" ADD CONSTRAINT "mentees_profile_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;