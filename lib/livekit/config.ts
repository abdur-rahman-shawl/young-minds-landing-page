/**
 * LiveKit Configuration
 *
 * Central configuration for all LiveKit-related functionality.
 *
 * Security: All secrets loaded from environment variables.
 * Fail-loud: Missing required variables throw errors immediately.
 *
 * Environment Variables Required:
 * - LIVEKIT_API_KEY: API key from livekit.yaml
 * - LIVEKIT_API_SECRET: API secret from livekit.yaml
 * - LIVEKIT_WS_URL: WebSocket URL to LiveKit server
 * - NEXT_PUBLIC_LIVEKIT_WS_URL: Public WebSocket URL for client
 */

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

const requiredEnvVars = [
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_WS_URL',
] as const;

// Validate server-side environment variables ONLY
if (typeof window === 'undefined') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `CRITICAL: Missing required environment variable: ${envVar}\n` +
        `LiveKit integration cannot function without this variable.\n` +
        `Add it to your .env.local file immediately.`
      );
    }
  }
}

// NOTE: NEXT_PUBLIC_* variables are NOT validated at module load time.
// They are validated lazily when accessed, because Next.js injects them
// at build/bundle time, not at module initialization time.

// ============================================================================
// UTILITY FUNCTIONS (Defined before config to avoid circular dependencies)
// ============================================================================

/**
 * Get the public WebSocket URL for client-side usage
 *
 * CRITICAL: This validates the environment variable at runtime,
 * not at module load time, to allow Next.js to inject it properly.
 */
export function getPublicWsUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;

  if (!wsUrl) {
    throw new Error(
      'CRITICAL: NEXT_PUBLIC_LIVEKIT_WS_URL is not defined.\n' +
      'Add it to your .env.local file and restart the Next.js dev server.\n' +
      'The variable MUST be prefixed with NEXT_PUBLIC_ to be available on the client.'
    );
  }

  return wsUrl;
}

/**
 * Get the server WebSocket URL for server-side usage
 */
export function getServerWsUrl(): string {
  if (typeof window !== 'undefined') {
    throw new Error('getServerWsUrl() can only be called on the server');
  }
  return process.env.LIVEKIT_WS_URL!;
}

// ============================================================================
// CONFIGURATION OBJECT
// ============================================================================

export const livekitConfig = {
  // Server configuration (server-side only)
  server: {
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
    wsUrl: process.env.LIVEKIT_WS_URL!,
  },

  // Client configuration (publicly accessible)
  // NOTE: Use getPublicWsUrl() function instead of accessing this directly
  client: {
    get wsUrl(): string {
      return getPublicWsUrl();
    },
  },

  // Room configuration
  room: {
    // Default room settings
    maxParticipants: 2, // mentor + mentee
    emptyTimeoutSeconds: 300, // 5 minutes
    maxDurationSeconds: 7200, // 2 hours

    // Room name generation
    generateRoomName: (sessionId: string): string => {
      // Format: session-{uuid}
      // This format is validated by database constraint
      return `session-${sessionId}`;
    },

    // Participant identity generation
    generateParticipantIdentity: (role: 'mentor' | 'mentee', userId: string): string => {
      // Format: {role}-{userId}
      return `${role}-${userId}`;
    },
  },

  // Token configuration
  token: {
    // Token time-to-live: 24 hours
    ttlSeconds: 24 * 60 * 60,

    // Token grants (permissions given to participants)
    grants: {
      // Core permissions
      canPublish: true,
      canSubscribe: true,
      canPublishData: true, // For chat messages

      // Room permissions
      roomJoin: true,
      roomCreate: false, // Only server can create rooms
      roomAdmin: false,  // No participant is admin

      // NOTE: canPublishSources is not specified here to allow all sources by default
      // When canPublish is true, LiveKit allows camera, microphone, and screen_share
    },
  },

  // Webhook configuration (for receiving events from LiveKit server)
  webhook: {
    // NOTE: Webhook URL is configured on LiveKit server in livekit.yaml
    // This is the secret used to verify webhook signatures
    secret: process.env.LIVEKIT_WEBHOOK_SECRET,
  },

  // Meeting page configuration
  meeting: {
    // Time window: users can join 15 minutes before scheduled time
    earlyJoinMinutes: 15,

    // Time window: meeting expires 2 hours after scheduled time
    lateJoinMaxHours: 2,

    // Video quality settings
    video: {
      defaultResolution: {
        width: 1280,
        height: 720,
        frameRate: 30,
      },

      // Enable adaptive streaming
      adaptiveStream: true,

      // Enable dynacast (dynamic broadcasting)
      dynacast: true,
    },

    // Audio quality settings
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LivekitConfig = typeof livekitConfig;
export type RoomGrants = typeof livekitConfig.token.grants;
export type ParticipantRole = 'mentor' | 'mentee';

// ============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate that a room name follows the expected format
 */
export function isValidRoomName(roomName: string): boolean {
  return /^session-[a-f0-9\-]+$/.test(roomName);
}

/**
 * Extract session ID from room name
 */
export function extractSessionIdFromRoomName(roomName: string): string | null {
  const match = roomName.match(/^session-([a-f0-9\-]+)$/);
  return match ? match[1] : null;
}

/**
 * Validate participant identity format
 */
export function isValidParticipantIdentity(identity: string): boolean {
  return /^(mentor|mentee)-.+$/.test(identity);
}

/**
 * Extract user role and ID from participant identity
 */
export function parseParticipantIdentity(identity: string): {
  role: ParticipantRole;
  userId: string;
} | null {
  const match = identity.match(/^(mentor|mentee)-(.+)$/);
  if (!match) return null;

  const role = match[1] as ParticipantRole;
  const userId = match[2];

  return { role, userId };
}
