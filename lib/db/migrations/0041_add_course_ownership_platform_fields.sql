DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_owner_type') THEN
    CREATE TYPE course_owner_type AS ENUM ('MENTOR', 'PLATFORM');
  END IF;
END $$;

ALTER TABLE mentor_content
  ALTER COLUMN mentor_id DROP NOT NULL;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS owner_type course_owner_type NOT NULL DEFAULT 'MENTOR',
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS platform_tags text,
  ADD COLUMN IF NOT EXISTS platform_name text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_owner_id_fkey'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES mentors(id)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE courses
SET owner_id = mentor_content.mentor_id
FROM mentor_content
WHERE courses.content_id = mentor_content.id
  AND courses.owner_id IS NULL;
