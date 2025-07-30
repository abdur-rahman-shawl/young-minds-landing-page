ALTER TABLE "course_modules" ADD COLUMN IF NOT EXISTS "learning_objectives" text; ALTER TABLE "course_modules" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" integer;
