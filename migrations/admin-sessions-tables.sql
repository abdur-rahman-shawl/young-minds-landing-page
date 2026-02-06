-- =====================================================
-- Admin Sessions Management - SQL Migration
-- Run this in your PostgreSQL database
-- =====================================================

-- Table 1: Admin Session Audit Trail
-- Tracks all admin actions on sessions for accountability
CREATE TABLE IF NOT EXISTS admin_session_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Action details
    action TEXT NOT NULL,
    -- Actions: ADMIN_FORCE_CANCEL, ADMIN_FORCE_COMPLETE, ADMIN_MANUAL_REFUND,
    --          ADMIN_REASSIGN_SESSION, ADMIN_CLEAR_NO_SHOW, ADMIN_POLICY_OVERRIDE,
    --          ADMIN_NOTE_ADDED, ADMIN_DISPUTE_RESOLVED
    
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    details JSONB,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_session_id 
ON admin_session_audit_trail(session_id);

-- Create index on admin_id for filtering by admin
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_admin_id 
ON admin_session_audit_trail(admin_id);

-- Create index on action for filtering by action type
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_action 
ON admin_session_audit_trail(action);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_created_at 
ON admin_session_audit_trail(created_at DESC);


-- =====================================================
-- Table 2: Admin Session Notes
-- Internal notes on sessions (not visible to users)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    admin_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_session_notes_session_id 
ON admin_session_notes(session_id);

-- Create index on admin_id for filtering by admin
CREATE INDEX IF NOT EXISTS idx_admin_session_notes_admin_id 
ON admin_session_notes(admin_id);


-- =====================================================
-- Verification: Check tables were created
-- =====================================================
-- Run this to verify:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('admin_session_audit_trail', 'admin_session_notes');
