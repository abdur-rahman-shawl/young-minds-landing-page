-- Add cancelledMentorIds column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS cancelled_mentor_ids JSONB DEFAULT '[]' NOT NULL;
