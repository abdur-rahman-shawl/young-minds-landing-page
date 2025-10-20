/**
 * LiveKit Room Events Webhook Handler
 *
 * Receives notifications from LiveKit server when room events occur:
 * - room_started: First participant joined
 * - room_finished: Last participant left
 * - participant_joined: New participant connected
 * - participant_left: Participant disconnected
 *
 * Primary Purpose: Trigger auto-recording when room starts
 *
 * Security:
 * - Webhook signature validation (TODO: when LiveKit adds support)
 * - Server-side only
 * - Non-blocking (doesn't fail if recording fails)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { livekitRecordings } from '@/lib/db/schema';
import { extractSessionIdFromRoomName } from '@/lib/livekit/config';
import { startRecording, stopRecording } from '@/lib/livekit/recording-manager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type RoomEventType =
  | 'room_started'
  | 'room_finished'
  | 'participant_joined'
  | 'participant_left'
  | 'track_published'
  | 'track_unpublished';

interface RoomEventWebhook {
  event: RoomEventType;
  room: {
    sid: string;
    name: string;
    empty_timeout: number;
    max_participants: number;
    creation_time: number;
    turn_password: string;
    enabled_codecs: any[];
    metadata: string;
    num_participants: number;
  };
  participant?: {
    sid: string;
    identity: string;
    state: string;
    tracks: any[];
    metadata: string;
    joined_at: number;
    name: string;
    version: number;
  };
}

type EgressEventType = 'egress_started' | 'egress_updated' | 'egress_ended';

interface LiveKitFileResult {
  filename?: string;
  size?: number;
  duration?: string | number;
  start_time?: string | number;
  end_time?: string | number;
  location?: string;
  [key: string]: unknown;
}

interface LiveKitEgressInfo {
  egressId: string;
  roomId?: string;
  roomName?: string;
  status: string;
  startedAt?: string | number;
  updatedAt?: string | number;
  endedAt?: string | number;
  error?: string;
  roomComposite?: {
    roomName?: string;
    layout?: string;
    file?: {
      filepath?: string;
    };
    preset?: string;
    [key: string]: unknown;
  };
  file?: {
    filename?: string;
    startedAt?: string | number;
    endedAt?: string | number;
    size?: number;
    duration?: string | number;
    [key: string]: unknown;
  };
  fileResults?: LiveKitFileResult[];
  [key: string]: unknown;
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received room event webhook');

    // ======================================================================
    // PARSE WEBHOOK PAYLOAD
    // ======================================================================
    const payload = await request.json();
    const eventType: string | undefined = payload?.event;

    if (!eventType) {
      console.error('❌ Invalid webhook payload: missing event', payload);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    if (eventType.startsWith('egress')) {
      const egressInfo = payload?.egressInfo as LiveKitEgressInfo | undefined;

      console.log(`📋 Egress event: ${eventType}`, {
        egressId: egressInfo?.egressId,
        status: egressInfo?.status,
        roomName: egressInfo?.roomName,
      });

      if (!egressInfo || !egressInfo.egressId) {
        console.error('❌ Invalid egress webhook payload:', payload);
        return NextResponse.json({ success: false, message: 'Missing egress info' }, { status: 200 });
      }

      await handleEgressEvent(eventType as EgressEventType, egressInfo);
      return NextResponse.json({ success: true, message: 'Egress event processed' });
    }

    const body: RoomEventWebhook = payload;

    console.log(`📋 Room event: ${body.event}`, {
      roomName: body.room?.name,
      numParticipants: body.room?.num_participants,
      participantIdentity: body.participant?.identity,
    });

    if (!body.room) {
      console.error('❌ Invalid room webhook payload:', body);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // ======================================================================
    // HANDLE DIFFERENT EVENT TYPES
    // ======================================================================
    switch (body.event) {
      case 'room_started':
        await handleRoomStarted(body.room);
        break;

      case 'room_finished':
        await handleRoomFinished(body.room);
        break;

      case 'participant_joined':
        console.log(
          `👤 Participant joined: ${body.participant?.identity} in room ${body.room.name}`
        );
        await handleParticipantJoined(body.room);
        break;

      case 'participant_left':
        console.log(
          `👋 Participant left: ${body.participant?.identity} from room ${body.room.name}`
        );
        break;

      default:
        console.log(`⏭️  Ignoring event type: ${body.event}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Room events webhook error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 200 even on error - don't block LiveKit webhook delivery
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 } // Return 200 to acknowledge receipt
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle room_started event
 * Triggers automatic recording if enabled for session
 */
async function handleRoomStarted(room: RoomEventWebhook['room']) {
  console.log(`🟢 Room started: ${room.name}`);

  try {
    // Extract session ID from room name (format: session-{uuid})
    const sessionId = extractSessionIdFromRoomName(room.name);

    if (!sessionId) {
      console.warn(
        `⚠️  Could not extract session ID from room name: ${room.name}`
      );
      return;
    }

    console.log(`🎬 Triggering auto-recording for session ${sessionId}`);

    // ======================================================================
    // START RECORDING AUTOMATICALLY
    // ======================================================================
    // Note: This is non-blocking - recording failure shouldn't break the meeting
    await startRecording(sessionId);

    console.log(`✅ Auto-recording triggered successfully for session ${sessionId}`);
  } catch (error) {
    // Log error but don't throw - recording failure shouldn't break webhook
    console.error('❌ Failed to start auto-recording:', {
      roomName: room.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // TODO: Send alert to system administrators
    // TODO: Create system notification for manual recording start
  }
}

/**
 * Handle room_finished event
 * Stops recording if active
 */
async function handleRoomFinished(room: RoomEventWebhook['room']) {
  console.log(`🔴 Room finished: ${room.name}`);

  try {
    // Extract session ID from room name
    const sessionId = extractSessionIdFromRoomName(room.name);

    if (!sessionId) {
      console.warn(
        `⚠️  Could not extract session ID from room name: ${room.name}`
      );
      return;
    }

    console.log(`⏹️  Stopping recording for session ${sessionId}`);

    // ======================================================================
    // STOP RECORDING AUTOMATICALLY
    // ======================================================================
    await stopRecording(sessionId);

    console.log(`✅ Recording stopped successfully for session ${sessionId}`);
  } catch (error) {
    // Log error but don't throw
    console.error('❌ Failed to stop recording:', {
      roomName: room.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // TODO: Send alert to system administrators
  }
}

/**
 * Handle participant_joined event
 * Acts as a fallback trigger for auto-recording when room_started isn't emitted
 */
async function handleParticipantJoined(room: RoomEventWebhook['room']) {
  try {
    // Some LiveKit deployments may omit room_started, so kick off recording
    // when the first participant joins.
    if (room.num_participants !== undefined && room.num_participants > 1) {
      return; // Recording should already be active
    }

    const sessionId = extractSessionIdFromRoomName(room.name);

    if (!sessionId) {
      console.warn(`⚠️  Could not extract session ID from room name: ${room.name}`);
      return;
    }

    console.log(`🎬 Ensuring recording started for session ${sessionId}`);
    await startRecording(sessionId);
  } catch (error) {
    console.error('❌ Failed to ensure recording on participant join:', {
      roomName: room.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// EGRESS EVENT HANDLING
// ============================================================================

async function handleEgressEvent(event: EgressEventType, egressInfo: LiveKitEgressInfo) {
  try {
    const recording = await db.query.livekitRecordings.findFirst({
      where: eq(livekitRecordings.recordingSid, egressInfo.egressId),
    });

    if (!recording) {
      console.warn(`⚠️  Received egress event for unknown recording: ${egressInfo.egressId}`);
      return;
    }

    const status = mapEgressStatus(egressInfo.status, event);
    const completedAt = parseLiveKitTimestamp(egressInfo.endedAt ?? egressInfo.updatedAt);
    const startedAt = parseLiveKitTimestamp(egressInfo.startedAt);

    const fileInfo = egressInfo.file ?? {};
    const firstResult = Array.isArray(egressInfo.fileResults) && egressInfo.fileResults.length > 0
      ? egressInfo.fileResults[0]
      : undefined;

    const duration = parseDurationSeconds(firstResult?.duration ?? fileInfo.duration);
    const fileSize = coerceNumber(firstResult?.size ?? fileInfo.size);

    const metadata = {
      ...(typeof recording.metadata === 'object' && recording.metadata !== null ? recording.metadata : {}),
      egressInfo,
    };

    await db
      .update(livekitRecordings)
      .set({
        status,
        durationSeconds: duration ?? recording.durationSeconds,
        fileSizeBytes: fileSize ?? recording.fileSizeBytes,
        startedAt: startedAt ?? recording.startedAt,
        completedAt: completedAt ?? (status === 'completed' ? new Date() : recording.completedAt),
        errorMessage: status === 'failed' ? egressInfo.error ?? recording.errorMessage : recording.errorMessage,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(livekitRecordings.id, recording.id));

    console.log(`✅ Recording ${recording.id} updated from egress webhook`, {
      status,
      egressId: egressInfo.egressId,
    });
  } catch (error) {
    console.error('❌ Failed processing egress webhook:', {
      event,
      egressId: egressInfo.egressId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function mapEgressStatus(status: string, event: EgressEventType): 'in_progress' | 'completed' | 'failed' {
  const normalized = status?.toUpperCase();

  if (normalized === 'EGRESS_ACTIVE' || event === 'egress_started') {
    return 'in_progress';
  }

  if (normalized === 'EGRESS_COMPLETE' || normalized === 'EGRESS_COMPLETED' || event === 'egress_ended') {
    return 'completed';
  }

  if (normalized === 'EGRESS_FAILED' || normalized === 'EGRESS_ABORTED') {
    return 'failed';
  }

  // Default to in-progress if status is unknown
  return 'in_progress';
}

function parseLiveKitTimestamp(value?: string | number): Date | null {
  const numericValue = coerceNumber(value);
  if (!numericValue) {
    return null;
  }

  // LiveKit timestamps are nanoseconds since epoch
  const milliseconds = Math.floor(numericValue / 1_000_000);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return null;
  }

  return new Date(milliseconds);
}

function parseDurationSeconds(value?: string | number): number | null {
  const numericValue = coerceNumber(value);
  if (!numericValue) {
    return null;
  }

  // Duration is reported in nanoseconds
  return Math.max(0, Math.round(numericValue / 1_000_000_000));
}

function coerceNumber(value?: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
