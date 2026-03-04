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

CREATE TABLE IF NOT EXISTS livekit_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  room_sid TEXT UNIQUE,
  status livekit_room_status NOT NULL DEFAULT 'pending',
  max_participants INTEGER NOT NULL DEFAULT 2,
  empty_timeout_seconds INTEGER DEFAULT 300,
  max_duration_seconds INTEGER DEFAULT 7200,
  recording_enabled BOOLEAN NOT NULL DEFAULT false,
  recording_sid TEXT,
  recording_url TEXT,
  recording_size_bytes INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_livekit_room_timestamps CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (ended_at IS NULL OR ended_at >= created_at) AND
    (started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at)
  ),
  CONSTRAINT check_livekit_room_name_format CHECK (room_name ~ '^session-[a-f0-9\\-]+$')
);

CREATE TABLE IF NOT EXISTS livekit_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES livekit_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_role livekit_participant_role NOT NULL,
  participant_status livekit_participant_status NOT NULL DEFAULT 'invited',
  participant_identity TEXT NOT NULL,
  participant_sid TEXT,
  access_token TEXT NOT NULL,
  token_issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  token_expires_at TIMESTAMP NOT NULL,
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  duration_seconds INTEGER,
  connection_quality TEXT,
  packet_loss_percentage DECIMAL(5, 2),
  jitter_ms INTEGER,
  device_info JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_livekit_participant_per_room UNIQUE(room_id, user_id),
  CONSTRAINT check_livekit_token_validity CHECK (token_expires_at > token_issued_at),
  CONSTRAINT check_livekit_join_leave CHECK (left_at IS NULL OR joined_at IS NULL OR left_at >= joined_at)
);

CREATE TABLE IF NOT EXISTS livekit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES livekit_rooms(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES livekit_participants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'webhook',
  webhook_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  user_agent TEXT,
  event_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS livekit_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES livekit_rooms(id) ON DELETE CASCADE,
  recording_sid TEXT NOT NULL UNIQUE,
  recording_type TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 's3',
  storage_path TEXT NOT NULL,
  file_url TEXT,
  file_size_bytes INTEGER,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  transcription_enabled BOOLEAN NOT NULL DEFAULT false,
  transcription_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS livekit_rooms_session_id_idx ON livekit_rooms(session_id);
CREATE INDEX IF NOT EXISTS livekit_rooms_status_idx ON livekit_rooms(status);
CREATE INDEX IF NOT EXISTS livekit_rooms_room_name_idx ON livekit_rooms(room_name);
CREATE INDEX IF NOT EXISTS livekit_rooms_created_at_idx ON livekit_rooms(created_at);

CREATE INDEX IF NOT EXISTS livekit_participants_room_id_idx ON livekit_participants(room_id);
CREATE INDEX IF NOT EXISTS livekit_participants_user_id_idx ON livekit_participants(user_id);
CREATE INDEX IF NOT EXISTS livekit_participants_status_idx ON livekit_participants(participant_status);
CREATE INDEX IF NOT EXISTS livekit_participants_token_expires_idx ON livekit_participants(token_expires_at);

CREATE INDEX IF NOT EXISTS livekit_events_room_id_idx ON livekit_events(room_id);
CREATE INDEX IF NOT EXISTS livekit_events_participant_id_idx ON livekit_events(participant_id);
CREATE INDEX IF NOT EXISTS livekit_events_event_type_idx ON livekit_events(event_type);
CREATE INDEX IF NOT EXISTS livekit_events_timestamp_idx ON livekit_events(event_timestamp);
CREATE INDEX IF NOT EXISTS livekit_events_webhook_id_idx ON livekit_events(webhook_id);

CREATE INDEX IF NOT EXISTS livekit_recordings_room_id_idx ON livekit_recordings(room_id);
CREATE INDEX IF NOT EXISTS livekit_recordings_status_idx ON livekit_recordings(status);
CREATE INDEX IF NOT EXISTS livekit_recordings_created_at_idx ON livekit_recordings(created_at);

-- ============================================================================
-- CREATE TRIGGERS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_livekit_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_livekit_rooms_updated_at ON livekit_rooms;
CREATE TRIGGER update_livekit_rooms_updated_at
  BEFORE UPDATE ON livekit_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_livekit_updated_at_column();

DROP TRIGGER IF EXISTS update_livekit_participants_updated_at ON livekit_participants;
CREATE TRIGGER update_livekit_participants_updated_at
  BEFORE UPDATE ON livekit_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_livekit_updated_at_column();

DROP TRIGGER IF EXISTS update_livekit_recordings_updated_at ON livekit_recordings;
CREATE TRIGGER update_livekit_recordings_updated_at
  BEFORE UPDATE ON livekit_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_livekit_updated_at_column();
