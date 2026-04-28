-- LiveKit Integration Migration
-- Migration: 0026
-- Description: Add tables for LiveKit video calling integration
-- Date: 2025-10-11
-- IMPORTANT: Run this migration manually with: npm run db:migrate

-- ============================================================================
-- CREATE ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE livekit_room_status AS ENUM ('pending', 'active', 'ended', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE livekit_participant_role AS ENUM ('mentor', 'mentee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE livekit_participant_status AS ENUM ('invited', 'joined', 'left', 'kicked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- LiveKit Rooms Table
CREATE TABLE IF NOT EXISTS livekit_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to session (ONE-TO-ONE relationship)
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- Room identifiers
  room_name TEXT NOT NULL UNIQUE,
  room_sid TEXT UNIQUE,

  -- Room state
  status livekit_room_status NOT NULL DEFAULT 'pending',

  -- Configuration
  max_participants INTEGER NOT NULL DEFAULT 2,
  empty_timeout_seconds INTEGER DEFAULT 300,
  max_duration_seconds INTEGER DEFAULT 7200,

  -- Recording settings
  recording_enabled BOOLEAN NOT NULL DEFAULT false,
  recording_sid TEXT,
  recording_url TEXT,
  recording_size_bytes INTEGER,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_livekit_room_timestamps CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (ended_at IS NULL OR ended_at >= created_at) AND
    (started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at)
  ),
  CONSTRAINT check_livekit_room_name_format CHECK (room_name ~ '^session-[a-f0-9\-]+$')
);

-- LiveKit Participants Table
CREATE TABLE IF NOT EXISTS livekit_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  room_id UUID NOT NULL REFERENCES livekit_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Participant details
  participant_role livekit_participant_role NOT NULL,
  participant_status livekit_participant_status NOT NULL DEFAULT 'invited',
  participant_identity TEXT NOT NULL,
  participant_sid TEXT,

  -- Access control
  access_token TEXT NOT NULL,
  token_issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  token_expires_at TIMESTAMP NOT NULL,

  -- Connection tracking
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  duration_seconds INTEGER,

  -- Connection quality metrics
  connection_quality TEXT,
  packet_loss_percentage DECIMAL(5, 2),
  jitter_ms INTEGER,

  -- Metadata
  device_info JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_livekit_participant_per_room UNIQUE(room_id, user_id),
  CONSTRAINT check_livekit_token_validity CHECK (token_expires_at > token_issued_at),
  CONSTRAINT check_livekit_join_leave CHECK (left_at IS NULL OR joined_at IS NULL OR left_at >= joined_at)
);

-- LiveKit Events Table
CREATE TABLE IF NOT EXISTS livekit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys (nullable - some events may not be participant-specific)
  room_id UUID REFERENCES livekit_rooms(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES livekit_participants(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'webhook',
  webhook_id TEXT,

  -- Metadata
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  event_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- LiveKit Recordings Table (Optional - for future recording feature)
CREATE TABLE IF NOT EXISTS livekit_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key
  room_id UUID NOT NULL REFERENCES livekit_rooms(id) ON DELETE CASCADE,

  -- Recording details
  recording_sid TEXT NOT NULL UNIQUE,
  recording_type TEXT NOT NULL,
  file_type TEXT NOT NULL,

  -- Storage
  storage_provider TEXT NOT NULL DEFAULT 's3',
  storage_path TEXT NOT NULL,
  file_url TEXT,
  file_size_bytes INTEGER,

  -- Duration
  duration_seconds INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,

  -- Processing
  transcription_enabled BOOLEAN NOT NULL DEFAULT false,
  transcription_url TEXT,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- livekit_rooms indexes
CREATE INDEX IF NOT EXISTS livekit_rooms_session_id_idx ON livekit_rooms(session_id);
CREATE INDEX IF NOT EXISTS livekit_rooms_status_idx ON livekit_rooms(status);
CREATE INDEX IF NOT EXISTS livekit_rooms_room_name_idx ON livekit_rooms(room_name);
CREATE INDEX IF NOT EXISTS livekit_rooms_created_at_idx ON livekit_rooms(created_at);

-- livekit_participants indexes
CREATE INDEX IF NOT EXISTS livekit_participants_room_id_idx ON livekit_participants(room_id);
CREATE INDEX IF NOT EXISTS livekit_participants_user_id_idx ON livekit_participants(user_id);
CREATE INDEX IF NOT EXISTS livekit_participants_status_idx ON livekit_participants(participant_status);
CREATE INDEX IF NOT EXISTS livekit_participants_token_expires_idx ON livekit_participants(token_expires_at);

-- livekit_events indexes
CREATE INDEX IF NOT EXISTS livekit_events_room_id_idx ON livekit_events(room_id);
CREATE INDEX IF NOT EXISTS livekit_events_participant_id_idx ON livekit_events(participant_id);
CREATE INDEX IF NOT EXISTS livekit_events_event_type_idx ON livekit_events(event_type);
CREATE INDEX IF NOT EXISTS livekit_events_timestamp_idx ON livekit_events(event_timestamp);
CREATE INDEX IF NOT EXISTS livekit_events_webhook_id_idx ON livekit_events(webhook_id);

-- livekit_recordings indexes
CREATE INDEX IF NOT EXISTS livekit_recordings_room_id_idx ON livekit_recordings(room_id);
CREATE INDEX IF NOT EXISTS livekit_recordings_status_idx ON livekit_recordings(status);
CREATE INDEX IF NOT EXISTS livekit_recordings_created_at_idx ON livekit_recordings(created_at);

-- ============================================================================
-- CREATE TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_livekit_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for livekit_rooms
DROP TRIGGER IF EXISTS update_livekit_rooms_updated_at ON livekit_rooms;
CREATE TRIGGER update_livekit_rooms_updated_at
  BEFORE UPDATE ON livekit_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_livekit_updated_at_column();

-- Trigger for livekit_participants
DROP TRIGGER IF EXISTS update_livekit_participants_updated_at ON livekit_participants;
CREATE TRIGGER update_livekit_participants_updated_at
  BEFORE UPDATE ON livekit_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_livekit_updated_at_column();

-- Trigger for livekit_recordings
DROP TRIGGER IF EXISTS update_livekit_recordings_updated_at ON livekit_recordings;
CREATE TRIGGER update_livekit_recordings_updated_at
  BEFORE UPDATE ON livekit_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_livekit_updated_at_column();

-- Function to calculate participant duration on update
CREATE OR REPLACE FUNCTION calculate_participant_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND NEW.joined_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_participant_duration_trigger ON livekit_participants;
CREATE TRIGGER calculate_participant_duration_trigger
  BEFORE UPDATE ON livekit_participants
  FOR EACH ROW
  EXECUTE FUNCTION calculate_participant_duration();

-- Function to automatically end room when all participants leave
CREATE OR REPLACE FUNCTION check_room_empty()
RETURNS TRIGGER AS $$
DECLARE
  active_participants INTEGER;
BEGIN
  IF NEW.left_at IS NOT NULL THEN
    SELECT COUNT(*) INTO active_participants
    FROM livekit_participants
    WHERE room_id = NEW.room_id
      AND participant_status = 'joined'
      AND left_at IS NULL;

    IF active_participants = 0 THEN
      UPDATE livekit_rooms
      SET status = 'ended',
          ended_at = NOW()
      WHERE id = NEW.room_id
        AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_room_empty_trigger ON livekit_participants;
CREATE TRIGGER check_room_empty_trigger
  AFTER UPDATE ON livekit_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_room_empty();

-- ============================================================================
-- CREATE VIEWS (Optional - for convenient querying)
-- ============================================================================

CREATE OR REPLACE VIEW active_livekit_rooms AS
SELECT
  lr.id,
  lr.room_name,
  lr.session_id,
  s.title AS session_title,
  s.scheduled_at,
  lr.started_at,
  lr.max_participants,
  COUNT(lp.id) AS current_participants,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'user_id', lp.user_id,
      'role', lp.participant_role,
      'status', lp.participant_status,
      'joined_at', lp.joined_at
    )
  ) AS participants
FROM livekit_rooms lr
LEFT JOIN sessions s ON lr.session_id = s.id
LEFT JOIN livekit_participants lp ON lr.id = lp.room_id
WHERE lr.status = 'active'
GROUP BY lr.id, s.title, s.scheduled_at;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE livekit_rooms IS 'Stores LiveKit video call rooms linked to mentoring sessions';
COMMENT ON TABLE livekit_participants IS 'Tracks participants in each LiveKit room with access tokens and metrics';
COMMENT ON TABLE livekit_events IS 'Audit log of all LiveKit events from webhooks and API calls';
COMMENT ON TABLE livekit_recordings IS 'Manages recording artifacts and metadata for recorded sessions';

COMMENT ON COLUMN livekit_rooms.room_sid IS 'LiveKit server-assigned room SID';
COMMENT ON COLUMN livekit_rooms.empty_timeout_seconds IS 'Seconds before empty room is automatically closed';
COMMENT ON COLUMN livekit_participants.participant_identity IS 'Unique identity passed to LiveKit for this participant';
COMMENT ON COLUMN livekit_events.webhook_id IS 'Used for webhook deduplication';

-- Migration complete
