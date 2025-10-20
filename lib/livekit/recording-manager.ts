/**
 * Recording Manager
 *
 * Production-grade recording lifecycle management: start, stop, status, playback.
 * Uses storage abstraction layer (provider-agnostic).
 *
 * Core Responsibilities:
 * - Start recording via Egress API
 * - Stop recording gracefully
 * - Generate playback URLs with authorization
 * - Manage recording metadata in database
 *
 * Security:
 * - All operations server-side only
 * - Authorization checks before playback
 * - Comprehensive audit logging
 * - Fail-loud error handling
 */

import { db } from '@/lib/db';
import { livekitRooms, livekitRecordings, livekitEvents, sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getStorageProvider } from './storage/storage-factory';
import { livekitConfig } from './config';
import jwt from 'jsonwebtoken';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RecordingConfig {
  enabled: boolean;
  resolution?: string;
  fps?: number;
  bitrate?: number;
}

interface EgressResponse {
  egress_id: string;
  room_name: string;
  status: string;
}

const RECORDING_TEMP_DISABLED = true;

const STALE_RECORDING_RETRY_THRESHOLD_MS = 5 * 60 * 1000;

// ============================================================================
// START RECORDING
// ============================================================================

/**
 * Start recording for a session
 *
 * Called automatically when first participant joins the room.
 * Creates recording record in database and calls Egress API.
 *
 * @param sessionId - UUID of the session
 * @returns Recording record or null if recording disabled
 * @throws Error if recording fails to start
 */
export async function startRecording(sessionId: string) {
  try {
    if (RECORDING_TEMP_DISABLED) {
      console.log(`⏸️  Recording temporarily disabled. Skipping start for session ${sessionId}`);
      return null;
    }

    console.log(`🎬 Starting recording for session ${sessionId}`);

    // ======================================================================
    // GET SESSION AND VALIDATE
    // ======================================================================
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      throw new Error(
        `CRITICAL: Session ${sessionId} not found. Cannot start recording for non-existent session.`
      );
    }

    // ======================================================================
    // CHECK IF RECORDING IS ENABLED
    // ======================================================================
    const recordingConfig = session.recordingConfig as unknown as RecordingConfig | null;

    if (!recordingConfig || !recordingConfig.enabled) {
      console.log(`⏭️  Recording disabled for session ${sessionId}`);
      return null;
    }

    // ======================================================================
    // GET ROOM INFO
    // ======================================================================
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
    });

    if (!room) {
      throw new Error(
        `CRITICAL: Room not found for session ${sessionId}. ` +
        `Room must exist before starting recording.`
      );
    }

    // ======================================================================
    // CHECK IF RECORDING ALREADY EXISTS
    // ======================================================================
    const existingRecording = await db.query.livekitRecordings.findFirst({
      where: and(
        eq(livekitRecordings.roomId, room.id),
        eq(livekitRecordings.status, 'in_progress')
      ),
    });

    if (existingRecording) {
      const startedAt = existingRecording.startedAt ? new Date(existingRecording.startedAt) : null;
      const isStale =
        !startedAt ||
        Date.now() - startedAt.getTime() > STALE_RECORDING_RETRY_THRESHOLD_MS;

      if (!isStale) {
        console.log(`⚠️  Recording already in progress for session ${sessionId}`);
        return existingRecording;
      }

      console.warn(
        `⚠️  Detected stale in-progress recording ${existingRecording.id} for session ${sessionId}. ` +
        `Marking as failed before retrying start.`
      );

      await db
        .update(livekitRecordings)
        .set({
          status: 'failed',
          errorMessage: 'Auto-marked as failed after stale detection',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(livekitRecordings.id, existingRecording.id));
    }

    // ======================================================================
    // CALL LIVEKIT EGRESS API TO START RECORDING
    // ======================================================================
    const egressUrl = livekitConfig.server.wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    const egressToken = generateEgressToken();

    console.log(`📡 Calling Egress API at ${egressUrl}`);

    // Force the lightest composite preset to minimize CPU usage on the egress node
    const resolution = (recordingConfig.resolution || '1280x720').toLowerCase();
    const preset = 'H264_432P_30';
    const audioOnly = true;
    const fileType = audioOnly ? 'ogg' : 'mp4';
    const storageExtension = audioOnly ? 'ogg' : 'mp4';

    const response = await fetch(`${egressUrl}/twirp/livekit.Egress/StartRoomCompositeEgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${egressToken}`,
      },
      body: JSON.stringify({
        room_name: room.roomName,
        layout: 'grid', // All participants in grid layout
        audio_only: audioOnly,
        video_only: false,
        file: {
          filepath: `/tmp/egress/sessions/${sessionId}/{time}.${storageExtension}`,
        },
        preset,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Egress API error (HTTP ${response.status}): ${errorText}\n` +
        `Make sure Egress service is running on Oracle VM.`
      );
    }

    const egressInfo: EgressResponse = await response.json();

    if (!egressInfo.egress_id) {
      throw new Error('Egress API returned success but no egress_id in response');
    }

    // ======================================================================
    // CREATE RECORDING RECORD IN DATABASE
    // ======================================================================
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const storagePath = `sessions/${sessionId}/${timestamp}.${storageExtension}`;

    const [recording] = await db.insert(livekitRecordings).values({
      roomId: room.id,
      recordingSid: egressInfo.egress_id,
      recordingType: 'composite',
      fileType,
      storageProvider: process.env.STORAGE_PROVIDER || 'supabase',
      storagePath,
      status: 'in_progress',
      startedAt: new Date(),
      metadata: {
        egressInfo,
        config: recordingConfig,
      },
    }).returning();

    // ======================================================================
    // LOG EVENT FOR AUDIT TRAIL
    // ======================================================================
    await db.insert(livekitEvents).values({
      roomId: room.id,
      eventType: 'recording_started',
      eventData: {
        recordingId: recording.id,
        egressId: egressInfo.egress_id,
        sessionId,
        roomName: room.roomName,
        resolution,
        preset,
      },
      source: 'api',
      severity: 'info',
    });

    console.log(
      `✅ Recording started successfully: ${recording.recordingSid} for session ${sessionId}`
    );

    return recording;
  } catch (error) {
    console.error(`❌ CRITICAL: Failed to start recording for session ${sessionId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// ============================================================================
// STOP RECORDING
// ============================================================================

/**
 * Stop recording for a session
 *
 * Called automatically when last participant leaves the room.
 * Sends stop command to Egress API.
 *
 * @param sessionId - UUID of the session
 * @throws Error if recording fails to stop
 */
export async function stopRecording(sessionId: string): Promise<void> {
  try {
    console.log(`⏹️  Stopping recording for session ${sessionId}`);

    // ======================================================================
    // GET ROOM AND ACTIVE RECORDING
    // ======================================================================
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
      with: {
        recordings: {
          where: eq(livekitRecordings.status, 'in_progress'),
        },
      },
    });

    if (!room || !room.recordings.length) {
      console.log(`⏭️  No active recording found for session ${sessionId}`);
      return;
    }

    const recording = room.recordings[0];

    // ======================================================================
    // CALL EGRESS API TO STOP RECORDING
    // ======================================================================
    const egressUrl = livekitConfig.server.wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    const egressToken = generateEgressToken();

    const response = await fetch(`${egressUrl}/twirp/livekit.Egress/StopEgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${egressToken}`,
      },
      body: JSON.stringify({
        egress_id: recording.recordingSid,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Egress API error (HTTP ${response.status}): ${errorText}`);
    }

    console.log(`✅ Recording stop requested: ${recording.recordingSid}`);
    console.log(`⏳ Waiting for webhook to complete upload and processing...`);

    // Note: Recording will be marked as completed by webhook handler
    // after file is uploaded to storage
  } catch (error) {
    console.error(`❌ Failed to stop recording for session ${sessionId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// GET PLAYBACK URL
// ============================================================================

/**
 * Get playback URL for a recording
 *
 * Generates temporary signed URL (expires in 1 hour) with authorization check.
 * Only session participants can access recordings.
 *
 * @param recordingId - UUID of the recording
 * @param userId - ID of the user requesting access
 * @returns Temporary signed URL for playback
 * @throws Error if unauthorized or recording not ready
 */
export async function getPlaybackUrl(recordingId: string, userId: string): Promise<string> {
  try {
    console.log(`🎥 Generating playback URL for recording ${recordingId}`);

    // ======================================================================
    // GET RECORDING WITH SESSION DATA
    // ======================================================================
    const recording = await db.query.livekitRecordings.findFirst({
      where: eq(livekitRecordings.id, recordingId),
      with: {
        room: {
          with: {
            session: true,
          },
        },
      },
    });

    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // ======================================================================
    // AUTHORIZATION: Check if user is participant
    // ======================================================================
    const session = recording.room.session;

    if (session.mentorId !== userId && session.menteeId !== userId) {
      throw new Error(
        `UNAUTHORIZED: User ${userId} is not authorized to view this recording. ` +
        `Only session participants can access recordings.`
      );
    }

    // ======================================================================
    // CHECK RECORDING STATUS
    // ======================================================================
    if (recording.status !== 'completed') {
      throw new Error(
        `Recording is not ready yet (status: ${recording.status}). ` +
        `Please wait for recording to complete processing.`
      );
    }

    if (!recording.storagePath) {
      throw new Error('Recording has no storage path - data corruption detected');
    }

    // ======================================================================
    // GENERATE SIGNED URL VIA STORAGE PROVIDER
    // ======================================================================
    const storageProvider = getStorageProvider();
    const playbackUrl = await storageProvider.getPlaybackUrl(
      recording.storagePath,
      3600 // 1 hour expiration
    );

    // ======================================================================
    // LOG ACCESS FOR AUDIT TRAIL
    // ======================================================================
    await db.insert(livekitEvents).values({
      roomId: recording.roomId,
      eventType: 'recording_accessed',
      eventData: {
        recordingId,
        userId,
        timestamp: new Date().toISOString(),
        userAgent: 'server', // Could pass from request if available
      },
      source: 'api',
      severity: 'info',
    });

    console.log(`✅ Playback URL generated for user ${userId}`);

    return playbackUrl;
  } catch (error) {
    console.error(`❌ Failed to generate playback URL:`, {
      recordingId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate JWT token for Egress API authentication
 *
 * Uses LiveKit API key and secret to create a valid JWT token.
 *
 * @returns JWT token for Egress API
 */
function generateEgressToken(): string {
  const apiKey = livekitConfig.server.apiKey;
  const apiSecret = livekitConfig.server.apiSecret;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'CRITICAL: LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured. ' +
      'Cannot generate Egress token without credentials.'
    );
  }

  const payload = {
    iss: apiKey,
    sub: apiKey,
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    video: {
      roomRecord: true,     // CRITICAL: Required for Egress recording operations
      roomCreate: true,     // Allow room creation
      roomJoin: true,       // Egress joins as participant to record
      roomAdmin: true,      // Admin permissions for room control
      canPublish: true,     // Publish composite stream
      canSubscribe: true,   // Subscribe to participant tracks to record them
    },
  };

  const token = jwt.sign(payload, apiSecret, { algorithm: 'HS256' });

  return token;
}
