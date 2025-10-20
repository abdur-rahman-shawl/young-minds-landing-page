-- Database Migration: Add recording configuration to sessions table
-- Migration: 0027
-- Description: Adds recording_config JSONB column for LiveKit recording settings
-- Date: 2025-10-20
-- IMPORTANT: Run this migration manually

-- ============================================================================
-- ADD RECORDING_CONFIG COLUMN
-- ============================================================================

ALTER TABLE sessions
ADD COLUMN recording_config JSONB
DEFAULT '{"enabled": true, "resolution": "1280x720", "fps": 30}'::jsonb;

-- ============================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================================
-- Index on the 'enabled' field for fast lookup of sessions with recording enabled

CREATE INDEX idx_sessions_recording_enabled
ON sessions ((recording_config->>'enabled'));

-- ============================================================================
-- ADD COLUMN COMMENT
-- ============================================================================

COMMENT ON COLUMN sessions.recording_config IS
'Recording configuration JSON: {enabled: boolean, resolution: string, fps: number, bitrate?: number}. Default: enabled=true, resolution="1280x720", fps=30';

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Verify column was added with correct default
-- Expected: All existing sessions should have recording enabled by default
-- SELECT id, recording_config FROM sessions LIMIT 5;

-- Verify index was created
-- Expected: Should see idx_sessions_recording_enabled in the list
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sessions' AND indexname LIKE '%recording%';

-- Count sessions with recording enabled
-- Expected: Should match total session count (all sessions have recording enabled by default)
-- SELECT COUNT(*) as total_sessions,
--        COUNT(*) FILTER (WHERE recording_config->>'enabled' = 'true') as with_recording_enabled
-- FROM sessions;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
