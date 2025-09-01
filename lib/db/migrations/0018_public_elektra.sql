ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "authProvider" text DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "state" text;