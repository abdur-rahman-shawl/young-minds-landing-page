ALTER TABLE "mentors"
ADD COLUMN IF NOT EXISTS "is_expert" boolean DEFAULT false NOT NULL;
