ALTER TABLE "mentor_content"
ADD COLUMN IF NOT EXISTS "status_before_archive" text;

ALTER TABLE "mentor_content"
ADD COLUMN IF NOT EXISTS "require_review_after_restore" boolean DEFAULT false;

ALTER TABLE "mentor_content"
ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

ALTER TABLE "mentor_content"
ADD COLUMN IF NOT EXISTS "deleted_by" text REFERENCES "users"("id") ON DELETE set null;

ALTER TABLE "mentor_content"
ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE "mentor_content"
ADD COLUMN IF NOT EXISTS "purge_after_at" timestamp;

CREATE INDEX IF NOT EXISTS "mentor_content_deleted_at_idx"
ON "mentor_content" ("deleted_at");

CREATE INDEX IF NOT EXISTS "mentor_content_purge_after_at_idx"
ON "mentor_content" ("purge_after_at");
