CREATE TYPE "public"."verification_status" AS ENUM('YET_TO_APPLY', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'REVERIFICATION');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "assigned_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mentors" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "verification_status" "verification_status" DEFAULT 'YET_TO_APPLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "mentors" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
