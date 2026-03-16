-- Migration: Add FLAGGED status and Admin review actions
-- Run this in your Supabase SQL Editor or existing PostgreSQL client

BEGIN;

-- 1. Add 'FLAGGED' to content_status enum
-- Note: Postgres requires ALTER TYPE ADD VALUE to be outside of a transaction block in some versions, 
-- but we can use a DO block to catch if it already exists.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_status' AND e.enumlabel = 'FLAGGED') THEN
        ALTER TYPE content_status ADD VALUE 'FLAGGED';
    END IF;
END$$;

-- 2. Add new actions to content_review_action enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_review_action' AND e.enumlabel = 'FLAGGED') THEN
        ALTER TYPE content_review_action ADD VALUE 'FLAGGED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_review_action' AND e.enumlabel = 'UNFLAGGED') THEN
        ALTER TYPE content_review_action ADD VALUE 'UNFLAGGED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_review_action' AND e.enumlabel = 'FORCE_APPROVED') THEN
        ALTER TYPE content_review_action ADD VALUE 'FORCE_APPROVED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_review_action' AND e.enumlabel = 'FORCE_ARCHIVED') THEN
        ALTER TYPE content_review_action ADD VALUE 'FORCE_ARCHIVED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_review_action' AND e.enumlabel = 'APPROVAL_REVOKED') THEN
        ALTER TYPE content_review_action ADD VALUE 'APPROVAL_REVOKED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'content_review_action' AND e.enumlabel = 'FORCE_DELETED') THEN
        ALTER TYPE content_review_action ADD VALUE 'FORCE_DELETED';
    END IF;
END$$;

-- 3. Add flag columns to mentor_content table
ALTER TABLE mentor_content 
    ADD COLUMN IF NOT EXISTS flag_reason TEXT,
    ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS flagged_by TEXT REFERENCES users(id) ON DELETE SET NULL;

COMMIT;

-- Verification
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'content_status'::regtype;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'content_review_action'::regtype;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mentor_content';
