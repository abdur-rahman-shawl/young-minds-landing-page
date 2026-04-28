-- Net-new schema changes not covered by prior manual migrations.
-- All statements are guarded with IF NOT EXISTS / DO blocks for idempotency.

-- ============================================================
-- New enum types
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "public"."content_review_action" AS ENUM(
    'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'ARCHIVED', 'RESTORED',
    'FLAGGED', 'UNFLAGGED', 'FORCE_APPROVED', 'FORCE_ARCHIVED', 'APPROVAL_REVOKED', 'FORCE_DELETED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- ============================================================
-- notification_type: add reschedule / reassignment values
-- ============================================================
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'RESCHEDULE_REQUEST'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'RESCHEDULE_ACCEPTED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'RESCHEDULE_REJECTED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'RESCHEDULE_COUNTER'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'RESCHEDULE_WITHDRAWN'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'SESSION_REASSIGNED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'REASSIGNMENT_ACCEPTED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'REASSIGNMENT_REJECTED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- ============================================================
-- content_status: expand enum (drop + recreate, no data in fresh bootstrap)
-- ============================================================
ALTER TABLE "mentor_content" ALTER COLUMN "status" SET DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "mentor_content" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."content_status";
--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED', 'FLAGGED');
--> statement-breakpoint
ALTER TABLE "mentor_content" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."content_status";
--> statement-breakpoint
ALTER TABLE "mentor_content" ALTER COLUMN "status" SET DATA TYPE "public"."content_status" USING "status"::"public"."content_status";
--> statement-breakpoint

-- ============================================================
-- review_questions.is_active: text -> boolean
-- ============================================================
ALTER TABLE "review_questions" ALTER COLUMN "is_active" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "review_questions" ALTER COLUMN "is_active" SET DATA TYPE boolean USING CASE WHEN "is_active" = 'false' THEN false ELSE true END;
--> statement-breakpoint
ALTER TABLE "review_questions" ALTER COLUMN "is_active" SET DEFAULT true;
--> statement-breakpoint

-- ============================================================
-- New tables
-- ============================================================
CREATE TABLE IF NOT EXISTS "reschedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"initiated_by" text NOT NULL,
	"initiator_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposed_time" timestamp NOT NULL,
	"proposed_duration" integer,
	"original_time" timestamp NOT NULL,
	"counter_proposed_time" timestamp,
	"counter_proposed_by" text,
	"counter_proposal_count" integer DEFAULT 0 NOT NULL,
	"resolved_by" text,
	"resolver_id" text,
	"resolved_at" timestamp,
	"resolution_note" text,
	"cancellation_reason" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_review_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"action" "content_review_action" NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"reviewed_by" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentor_profile_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_profile_content_mentor_id_content_id_unique" UNIQUE("mentor_id","content_id")
);
--> statement-breakpoint

-- ============================================================
-- New columns on existing tables
-- ============================================================
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;
--> statement-breakpoint

-- sessions: reassignment / refund / reschedule tracking columns
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "mentor_reschedule_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "refund_amount" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "refund_percentage" integer;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "refund_status" text DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "pending_reschedule_request_id" uuid;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "pending_reschedule_time" timestamp;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "pending_reschedule_by" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "was_reassigned" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "reassigned_from_mentor_id" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "reassigned_at" timestamp;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "reassignment_status" text;
--> statement-breakpoint

-- mentor_content: review workflow columns
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "submitted_for_review_at" timestamp;
--> statement-breakpoint
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "reviewed_by" text;
--> statement-breakpoint
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "review_note" text;
--> statement-breakpoint
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "flag_reason" text;
--> statement-breakpoint
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "flagged_at" timestamp;
--> statement-breakpoint
ALTER TABLE "mentor_content" ADD COLUMN IF NOT EXISTS "flagged_by" text;
--> statement-breakpoint

-- reviews: status column (WIP schema addition)
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'submitted' NOT NULL;
--> statement-breakpoint

-- ============================================================
-- Missing columns present in production dump
-- ============================================================
-- notification_type: production enum values
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'MENTOR_APPLICATION_UPDATE_REQUESTED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'MENTOR_APPLICATION_APPROVED';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'MENTOR_APPLICATION_REJECTED';
--> statement-breakpoint

-- mentors: state column used in production
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "state" text;
--> statement-breakpoint

-- sessions: cancellation / no-show columns from production
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "no_show_marked_by" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "no_show_marked_at" timestamp;
--> statement-breakpoint

-- subscription tables: metadata + price columns present in production but missing from 0044
ALTER TABLE "subscription_feature_categories" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "subscription_feature_categories" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "subscription_plan_features" ALTER COLUMN "limit_interval_count" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscription_plan_features" ADD COLUMN IF NOT EXISTS "price_amount" numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "subscription_plan_features" ADD COLUMN IF NOT EXISTS "price_currency" text;
--> statement-breakpoint
ALTER TABLE "subscription_plan_features" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "subscription_plan_features" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN IF NOT EXISTS "intro_duration_intervals" integer;
--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "subscription_team_members" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "subscription_usage_tracking" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint

-- ============================================================
-- FK constraints for new tables
-- ============================================================
DO $$ BEGIN
  ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_session_id_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_initiator_id_users_id_fk"
    FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_resolver_id_users_id_fk"
    FOREIGN KEY ("resolver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "content_review_audit" ADD CONSTRAINT "content_review_audit_content_id_mentor_content_id_fk"
    FOREIGN KEY ("content_id") REFERENCES "public"."mentor_content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "content_review_audit" ADD CONSTRAINT "content_review_audit_mentor_id_mentors_id_fk"
    FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "content_review_audit" ADD CONSTRAINT "content_review_audit_reviewed_by_users_id_fk"
    FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mentor_profile_content" ADD CONSTRAINT "mentor_profile_content_mentor_id_mentors_id_fk"
    FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mentor_profile_content" ADD CONSTRAINT "mentor_profile_content_content_id_mentor_content_id_fk"
    FOREIGN KEY ("content_id") REFERENCES "public"."mentor_content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mentor_content" ADD CONSTRAINT "mentor_content_reviewed_by_users_id_fk"
    FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mentor_content" ADD CONSTRAINT "mentor_content_flagged_by_users_id_fk"
    FOREIGN KEY ("flagged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
