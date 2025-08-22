CREATE TYPE "public"."message_status" AS ENUM('sending', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'file', 'audio', 'video', 'system', 'request_accepted', 'request_rejected');--> statement-breakpoint
CREATE TYPE "public"."message_request_status" AS ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_request_type" AS ENUM('mentor_to_mentee', 'mentee_to_mentor');--> statement-breakpoint
CREATE TYPE "public"."permission_status" AS ENUM('active', 'suspended', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TABLE "message_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"request_type" "message_request_type" NOT NULL,
	"status" "message_request_status" DEFAULT 'pending' NOT NULL,
	"initial_message" text NOT NULL,
	"request_reason" text,
	"max_messages" integer DEFAULT 1,
	"messages_used" integer DEFAULT 0,
	"responded_at" timestamp,
	"response_message" text,
	"expires_at" timestamp NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"daily_request_limit" integer DEFAULT 5,
	"weekly_request_limit" integer DEFAULT 10,
	"monthly_request_limit" integer DEFAULT 30,
	"requests_sent_today" integer DEFAULT 0,
	"requests_sent_this_week" integer DEFAULT 0,
	"requests_sent_this_month" integer DEFAULT 0,
	"daily_message_limit" integer DEFAULT 500,
	"messages_sent_today" integer DEFAULT 0,
	"last_reset_daily" timestamp DEFAULT now() NOT NULL,
	"last_reset_weekly" timestamp DEFAULT now() NOT NULL,
	"last_reset_monthly" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_quotas_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "messaging_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"allowed_user_id" text NOT NULL,
	"status" "permission_status" DEFAULT 'active' NOT NULL,
	"granted_via_request_id" uuid,
	"daily_message_limit" integer DEFAULT 100,
	"total_message_limit" integer,
	"messages_exchanged" integer DEFAULT 0,
	"can_initiate_video" boolean DEFAULT false,
	"can_share_files" boolean DEFAULT false,
	"can_schedule_meetings" boolean DEFAULT true,
	"blocked_by_user" boolean DEFAULT false,
	"blocked_by_allowed_user" boolean DEFAULT false,
	"blocked_at" timestamp,
	"block_reason" text,
	"last_message_at" timestamp,
	"expires_at" timestamp,
	"notification_preferences" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant1_id" text NOT NULL,
	"participant2_id" text NOT NULL,
	"status" "thread_status" DEFAULT 'active' NOT NULL,
	"last_message_id" uuid,
	"last_message_at" timestamp,
	"last_message_preview" text,
	"participant1_unread_count" integer DEFAULT 0,
	"participant2_unread_count" integer DEFAULT 0,
	"participant1_last_read_at" timestamp,
	"participant2_last_read_at" timestamp,
	"participant1_muted" boolean DEFAULT false,
	"participant2_muted" boolean DEFAULT false,
	"participant1_muted_until" timestamp,
	"participant2_muted_until" timestamp,
	"participant1_archived" boolean DEFAULT false,
	"participant2_archived" boolean DEFAULT false,
	"participant1_archived_at" timestamp,
	"participant2_archived_at" timestamp,
	"participant1_deleted" boolean DEFAULT false,
	"participant2_deleted" boolean DEFAULT false,
	"participant1_deleted_at" timestamp,
	"participant2_deleted_at" timestamp,
	"total_messages" integer DEFAULT 0,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewee_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"reviewer_role" text NOT NULL,
	"communication_rating" integer,
	"knowledge_rating" integer,
	"helpfulness_rating" integer,
	"professionalism_rating" integer,
	"response" text,
	"responded_at" timestamp,
	"is_public" text DEFAULT 'true' NOT NULL,
	"is_verified" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "receiver_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_type" SET DEFAULT 'text'::"public"."message_type";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_type" SET DATA TYPE "public"."message_type" USING "message_type"::"public"."message_type";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "thread_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "status" "message_status" DEFAULT 'sending' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_quotas" ADD CONSTRAINT "message_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_permissions" ADD CONSTRAINT "messaging_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_permissions" ADD CONSTRAINT "messaging_permissions_allowed_user_id_users_id_fk" FOREIGN KEY ("allowed_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_participant1_id_users_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_participant2_id_users_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;