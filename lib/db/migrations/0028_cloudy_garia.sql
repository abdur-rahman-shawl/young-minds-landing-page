CREATE TYPE "public"."consent_action" AS ENUM('granted', 'denied', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."consent_source" AS ENUM('ui', 'oauth', 'browser_prompt', 'system');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_role" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"status" text,
	"request_id" text,
	"trace_id" text,
	"ip_address" text,
	"user_agent" text,
	"details" jsonb,
	"diff" jsonb,
	"schema_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"user_email" text,
	"user_role" text,
	"consent_type" text NOT NULL,
	"consent_version" text,
	"action" "consent_action" NOT NULL,
	"source" "consent_source" NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"to" text NOT NULL,
	"subject" text,
	"template" text,
	"actor_type" text,
	"actor_id" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "session_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_key" text NOT NULL,
	"policy_value" text NOT NULL,
	"policy_type" text DEFAULT 'string' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_policies_policy_key_unique" UNIQUE("policy_key")
);
--> statement-breakpoint
CREATE TABLE "session_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"reason_category" text,
	"reason_details" text,
	"previous_scheduled_at" timestamp,
	"new_scheduled_at" timestamp,
	"policy_snapshot" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chatbot_message_insights" ADD COLUMN "frequency" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "banner_image_url" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_type" text DEFAULT 'PAID' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "reschedule_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_audit_log" ADD CONSTRAINT "session_audit_log_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_audit_log" ADD CONSTRAINT "session_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_resource_occurred_idx" ON "audit_events" USING btree ("resource_type","resource_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_occurred_idx" ON "audit_events" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_action_occurred_idx" ON "audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "consent_events_user_type_created_idx" ON "consent_events" USING btree ("user_id","consent_type","created_at");--> statement-breakpoint
CREATE INDEX "consent_events_type_created_idx" ON "consent_events" USING btree ("consent_type","created_at");--> statement-breakpoint
CREATE INDEX "email_events_action_occurred_idx" ON "email_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "email_events_recipient_occurred_idx" ON "email_events" USING btree ("to","occurred_at");