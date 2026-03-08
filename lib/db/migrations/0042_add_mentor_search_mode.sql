DO $$ BEGIN
  CREATE TYPE "public"."mentor_search_mode" AS ENUM('AI_SEARCH', 'EXCLUSIVE_SEARCH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "mentors"
ADD COLUMN IF NOT EXISTS "search_mode" "mentor_search_mode" DEFAULT 'AI_SEARCH' NOT NULL;
