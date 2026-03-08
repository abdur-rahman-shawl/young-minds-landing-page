ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "cancelled_mentor_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
