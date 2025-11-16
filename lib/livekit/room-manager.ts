/**
 * LiveKit Room Manager
 *
 * Production-grade utility for managing LiveKit rooms, participants, and tokens.
 *
 * Core Responsibilities:
 * - Create rooms for sessions
 * - Generate secure access tokens (server-side only)
 * - Manage participant lifecycle
 * - End rooms gracefully
 * - Log all operations for audit trail
 *
 * Security Principles:
 * - All operations validate user permissions
 * - Tokens are generated server-side only
 * - Database operations use transactions where appropriate
 * - All errors are logged and thrown (fail loudly)
 */

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { db } from '@/lib/db';
import {
  sessions,
  users,
  livekitRooms,
  livekitParticipants,
  livekitEvents,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { livekitConfig, type ParticipantRole, getPublicWsUrl } from './config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CreateRoomResult {
  roomId: string;
  roomName: string;
  meetingUrl: string;
}

interface GenerateTokenResult {
  token: string;
  roomName: string;
  participantName: string;
  wsUrl: string;
  expiresAt: Date;
}

interface RoomParticipant {
  userId: string;
  role: ParticipantRole;
  name: string;
  email: string;
}

// ============================================================================
// ROOM MANAGER CLASS
// ============================================================================

export class LiveKitRoomManager {
  /**
   * Get RoomServiceClient for interacting with LiveKit server
   * @private
   */
  private static getRoomServiceClient(): RoomServiceClient {
    return new RoomServiceClient(
      livekitConfig.server.wsUrl,
      livekitConfig.server.apiKey,
      livekitConfig.server.apiSecret
    );
  }

  /**
   * Create a new LiveKit room for a session
   *
   * Called when a session is booked. Creates:
   * 1. ACTUAL room on LiveKit server (via API)
   * 2. Room record in database
   * 3. Participant records for mentor and mentee
   * 4. Initial audit log entries
   *
   * CRITICAL: Room MUST be created on LiveKit server FIRST, then database.
   * If database creation fails, LiveKit room is deleted to prevent orphans.
   *
   * @param sessionId - UUID of the session
   * @returns Room information including meeting URL
   * @throws Error if session not found or room already exists
   */
  static async createRoomForSession(sessionId: string): Promise<CreateRoomResult> {
    // Validate session exists and get participants
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        mentor: true,
        mentee: true,
      },
    });

    if (!session) {
      throw new Error(
        `CRITICAL: Cannot create room for non-existent session: ${sessionId}`
      );
    }

    // Check if room already exists
    const existingRoom = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
    });

    if (existingRoom) {
      throw new Error(
        `CRITICAL: Room already exists for session ${sessionId}. ` +
        `Room ID: ${existingRoom.id}. Cannot create duplicate rooms.`
      );
    }

    // Generate unique room name
    const roomName = livekitConfig.room.generateRoomName(sessionId);

    // ========================================================================
    // STEP 1: CREATE ROOM ON LIVEKIT SERVER FIRST
    // ========================================================================
    // CRITICAL: The room MUST exist on the LiveKit server before generating tokens
    let livekitRoom;
    try {
      const roomService = this.getRoomServiceClient();

      console.log(`📹 Creating room on LiveKit server: ${roomName}`);

      livekitRoom = await roomService.createRoom({
        name: roomName,
        emptyTimeout: livekitConfig.room.emptyTimeoutSeconds,
        maxParticipants: livekitConfig.room.maxParticipants,
        metadata: JSON.stringify({
          sessionId,
          sessionTitle: session.title,
          scheduledAt: session.scheduledAt.toISOString(),
        }),
      });

      console.log(
        `✅ LiveKit server room created: ${livekitRoom.name} (SID: ${livekitRoom.sid})`
      );
    } catch (error) {
      console.error(`❌ CRITICAL: Failed to create room on LiveKit server:`, error);
      throw new Error(
        `Failed to create room on LiveKit server: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // ========================================================================
    // STEP 2: CREATE DATABASE RECORD
    // ========================================================================
    try {
      // Create room record in database
      const [room] = await db
        .insert(livekitRooms)
        .values({
          sessionId,
          roomName,
          roomSid: livekitRoom.sid, // Store LiveKit's server-assigned SID
          status: 'pending',
          maxParticipants: livekitConfig.room.maxParticipants,
          emptyTimeoutSeconds: livekitConfig.room.emptyTimeoutSeconds,
          maxDurationSeconds: livekitConfig.room.maxDurationSeconds,
          recordingEnabled: false, // TODO: Make configurable
          metadata: {
            sessionTitle: session.title,
            scheduledAt: session.scheduledAt.toISOString(),
            livekitRoomSid: livekitRoom.sid,
          },
        })
        .returning();

      // Create participant records for mentor and mentee
      await Promise.all([
        this.createParticipantRecord(
          room.id,
          session.mentorId,
          'mentor',
          session.mentor
        ),
        this.createParticipantRecord(
          room.id,
          session.menteeId,
          'mentee',
          session.mentee
        ),
      ]);

      // Log room creation event
      await this.logEvent(room.id, null, 'room_created', {
        sessionId,
        roomName,
        scheduledAt: session.scheduledAt.toISOString(),
      });

      // Generate meeting URL (relative path for database storage)
      // Full URLs should be constructed at render time, not stored in DB
      const meetingUrl = `/meeting/${sessionId}`;

      console.log(`✅ LiveKit room created: ${roomName} (${room.id}) for session ${sessionId}`);

      return {
        roomId: room.id,
        roomName,
        meetingUrl,
      };
    } catch (dbError) {
      // ======================================================================
      // CLEANUP: If database creation failed, delete the LiveKit room
      // ======================================================================
      console.error(
        `❌ CRITICAL: Database creation failed after LiveKit room was created. Cleaning up...`,
        dbError
      );

      try {
        const roomService = this.getRoomServiceClient();
        await roomService.deleteRoom(roomName);
        console.log(`🧹 Cleanup successful: Deleted orphaned LiveKit room ${roomName}`);
      } catch (cleanupError) {
        console.error(
          `⚠️ WARNING: Failed to cleanup orphaned LiveKit room ${roomName}:`,
          cleanupError
        );
        // Log this for manual cleanup
        console.error(
          `🚨 MANUAL CLEANUP REQUIRED: LiveKit room "${roomName}" exists on server but not in database`
        );
      }

      throw new Error(
        `Failed to create LiveKit room database record: ${
          dbError instanceof Error ? dbError.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generate access token for a participant
   *
   * Called when a user accesses the meeting page. Validates:
   * 1. User is a participant of the session
   * 2. Session/room exists and is valid
   * 3. User has not been kicked
   *
   * @param sessionId - UUID of the session
   * @param userId - ID of the user requesting access
   * @returns Access token and connection details
   * @throws Error if user is not authorized or room not found
   */
  static async generateAccessToken(
    sessionId: string,
    userId: string
  ): Promise<GenerateTokenResult> {
    // Get room and validate it exists
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
      with: {
        participants: {
          where: eq(livekitParticipants.userId, userId),
        },
      },
    });

    if (!room) {
      throw new Error(
        `CRITICAL: No LiveKit room found for session ${sessionId}. ` +
        `Room must be created before generating tokens.`
      );
    }

    // Validate user is a participant
    const participant = room.participants[0];
    if (!participant) {
      throw new Error(
        `UNAUTHORIZED: User ${userId} is not a participant of session ${sessionId}. ` +
        `Only session participants can join the meeting.`
      );
    }

    // Validate participant hasn't been kicked
    if (participant.participantStatus === 'kicked') {
      throw new Error(
        `FORBIDDEN: User ${userId} has been removed from session ${sessionId}. ` +
        `Cannot generate access token for kicked participants.`
      );
    }

    // Get user details for participant name
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error(
        `CRITICAL: User ${userId} not found in database. ` +
        `Cannot generate token for non-existent user.`
      );
    }

    try {
      // Create access token using LiveKit SDK
      const token = new AccessToken(
        livekitConfig.server.apiKey,
        livekitConfig.server.apiSecret,
        {
          identity: participant.participantIdentity,
          name: user.name || user.email,
          ttl: `${livekitConfig.token.ttlSeconds}s`,
        }
      );

      // Add video grant with permissions
      // NOTE: canPublishSources is intentionally omitted to allow all sources by default
      // LiveKit will allow camera, microphone, and screen_share when canPublish is true
      token.addGrant({
        room: room.roomName,
        roomJoin: livekitConfig.token.grants.roomJoin,
        canPublish: livekitConfig.token.grants.canPublish,
        canSubscribe: livekitConfig.token.grants.canSubscribe,
        canPublishData: livekitConfig.token.grants.canPublishData,
        // canPublishSources: Not specified - allows all sources when canPublish is true
      });

      // Set metadata (available to webhooks and client)
      token.metadata = JSON.stringify({
        userId,
        role: participant.participantRole,
        sessionId,
      });

      // Generate JWT token
      const jwt = await token.toJwt();

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + livekitConfig.token.ttlSeconds * 1000);

      // Update participant record with new token
      await db
        .update(livekitParticipants)
        .set({
          accessToken: jwt,
          tokenIssuedAt: new Date(),
          tokenExpiresAt: expiresAt,
        })
        .where(eq(livekitParticipants.id, participant.id));

      // Log token generation event
      await this.logEvent(room.id, participant.id, 'token_generated', {
        userId,
        role: participant.participantRole,
        expiresAt: expiresAt.toISOString(),
      });

      console.log(
        `✅ Access token generated for user ${userId} (${participant.participantRole}) ` +
        `in room ${room.roomName}`
      );

      return {
        token: jwt,
        roomName: room.roomName,
        participantName: user.name || user.email,
        wsUrl: getPublicWsUrl(),
        expiresAt,
      };
    } catch (error) {
      console.error(
        `❌ Failed to generate token for user ${userId} in session ${sessionId}:`,
        error
      );
      throw new Error(
        `Failed to generate access token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * End a room gracefully
   *
   * Called when session is completed or cancelled. Updates:
   * 1. Room status to 'ended'
   * 2. All active participants to 'left'
   * 3. Audit log
   *
   * @param sessionId - UUID of the session
   * @throws Error if room not found
   */
  static async endRoom(sessionId: string): Promise<void> {
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
    });

    if (!room) {
      throw new Error(
        `CRITICAL: Cannot end room - no room found for session ${sessionId}`
      );
    }

    try {
      // Update room status
      await db
        .update(livekitRooms)
        .set({
          status: 'ended',
          endedAt: new Date(),
        })
        .where(eq(livekitRooms.id, room.id));

      // Update all joined participants to 'left'
      await db
        .update(livekitParticipants)
        .set({
          participantStatus: 'left',
          leftAt: new Date(),
        })
        .where(
          and(
            eq(livekitParticipants.roomId, room.id),
            eq(livekitParticipants.participantStatus, 'joined')
          )
        );

      // Log room end event
      await this.logEvent(room.id, null, 'room_ended', {
        sessionId,
        endedAt: new Date().toISOString(),
      });

      console.log(`✅ Room ${room.roomName} ended for session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to end room for session ${sessionId}:`, error);
      throw new Error(
        `Failed to end room: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create participant record in database
   */
  private static async createParticipantRecord(
    roomId: string,
    userId: string,
    role: ParticipantRole,
    user: any
  ): Promise<void> {
    const participantIdentity = livekitConfig.room.generateParticipantIdentity(role, userId);

    await db.insert(livekitParticipants).values({
      roomId,
      userId,
      participantRole: role,
      participantStatus: 'invited',
      participantIdentity,
      accessToken: 'pending', // Will be generated when user joins
      tokenExpiresAt: new Date(Date.now() + livekitConfig.token.ttlSeconds * 1000),
      metadata: {
        userEmail: user.email,
        userName: user.name,
      },
    });
  }

  /**
   * Log event to audit trail
   */
  private static async logEvent(
    roomId: string,
    participantId: string | null,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(livekitEvents).values({
        roomId,
        participantId,
        eventType,
        eventData,
        source: 'api',
        severity: 'info',
        eventTimestamp: new Date(),
      });
    } catch (error) {
      // Log events are non-critical - log error but don't throw
      console.error(`⚠️ Failed to log event ${eventType} for room ${roomId}:`, error);
    }
  }

  /**
   * Handle room activation (first participant joined)
   *
   * Called automatically by webhook when room becomes active.
   * Triggers auto-recording if enabled for the session.
   *
   * @param sessionId - UUID of the session
   * @returns void
   *
   * Note: This is non-blocking - recording failure should not break the meeting
   */
  static async handleRoomActivation(sessionId: string): Promise<void> {
    try {
      console.log(`🟢 Room activated for session ${sessionId}`);

      // Import recording manager dynamically to avoid circular dependencies
      const { startRecording } = await import('./recording-manager');

      // Start recording automatically if enabled
      await startRecording(sessionId);

      console.log(`✅ Auto-recording handled successfully for session ${sessionId}`);
    } catch (error) {
      console.error(
        `❌ Failed to handle room activation for session ${sessionId}:`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      // Don't throw - recording failure shouldn't break the meeting
      // The meeting should continue even if recording fails to start
    }
  }
}
