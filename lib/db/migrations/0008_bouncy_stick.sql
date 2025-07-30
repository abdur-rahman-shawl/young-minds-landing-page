ALTER TABLE "mentors" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "mentors" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "mentor_content" ALTER COLUMN "mentor_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "course_modules" ADD COLUMN "learning_objectives" text;--> statement-breakpoint
ALTER TABLE "course_modules" ADD COLUMN "estimated_duration_minutes" integer;