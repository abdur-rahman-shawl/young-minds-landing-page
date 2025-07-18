CREATE TYPE "public"."verification_status" AS ENUM('YET_TO_APPLY', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'REVERIFICATION');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "assigned_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mentors" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mentors" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "mentors" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "verification_status" "verification_status" DEFAULT 'YET_TO_APPLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "mentors" DROP COLUMN "is_verified";