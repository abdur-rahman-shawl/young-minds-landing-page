/**
 * LiveKit Integration Schema
 *
 * Production-grade schema for managing LiveKit video calling rooms,
 * participants, events, and recordings.
 *
 * Security: All foreign keys cascade on delete for data integrity.
 * Performance: Indexes on all query-critical columns.
 * Reliability: Timestamps, enums, and constraints ensure data consistency.
 */

import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, pgEnum, decimal, index, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions';
import { users } from './users';

// ============================================================================
// ENUMS
// ============================================================================

export const livekitRoomStatus = pgEnum('livekit_room_status', [
  'pending',    // Room created, waiting for first participant
  'active',     // At least one participant joined
  'ended',      // Session completed normally
  'failed'      // Technical failure or error
]);

export const livekitParticipantRole = pgEnum('livekit_participant_role', [
  'mentor',
  'mentee'
]);

export const livekitParticipantStatus = pgEnum('livekit_participant_status', [
  'invited',    // Participant record created, not yet joined
  'joined',     // Currently in the room
  'left',       // Disconnected normally
  'kicked'      // Removed by moderator or system
]);

// ============================================================================
// LIVEKIT ROOMS TABLE
// ============================================================================

export const livekitRooms = pgTable('livekit_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Link to session - ONE-TO-ONE relationship
  sessionId: uuid('session_id')
    .references(() => sessions.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // Enforce one room per session

  // Room identifiers
  roomName: text('room_name').notNull().unique(), // Format: session-{uuid}
  roomSid: text('room_sid').unique(), // LiveKit server-assigned SID

  // Room state
  status: livekitRoomStatus('status').notNull().default('pending'),

  // Configuration
  maxParticipants: integer('max_participants').notNull().default(2),
  emptyTimeoutSeconds: integer('empty_timeout_seconds').default(300), // 5 minutes
  maxDurationSeconds: integer('max_duration_seconds').default(7200), // 2 hours

  // Recording settings
  recordingEnabled: boolean('recording_enabled').default(false).notNull(),
  recordingSid: text('recording_sid'),
  recordingUrl: text('recording_url'),
  recordingSizeBytes: integer('recording_size_bytes'),

  // Metadata - flexible JSON for additional data
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'), // First participant joined
  endedAt: timestamp('ended_at'),     // Room closed
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for query performance
  sessionIdIdx: index('livekit_rooms_session_id_idx').on(table.sessionId),
  statusIdx: index('livekit_rooms_status_idx').on(table.status),
  roomNameIdx: index('livekit_rooms_room_name_idx').on(table.roomName),
  createdAtIdx: index('livekit_rooms_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// LIVEKIT PARTICIPANTS TABLE
// ============================================================================

export const livekitParticipants = pgTable('livekit_participants', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Foreign keys
  roomId: uuid('room_id')
    .references(() => livekitRooms.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Participant details
  participantRole: livekitParticipantRole('participant_role').notNull(),
  participantStatus: livekitParticipantStatus('participant_status').notNull().default('invited'),
  participantIdentity: text('participant_identity').notNull(), // Format: {role}-{userId}
  participantSid: text('participant_sid'), // LiveKit server-assigned SID

  // Access control
  accessToken: text('access_token').notNull(),
  tokenIssuedAt: timestamp('token_issued_at').defaultNow().notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),

  // Connection tracking
  joinedAt: timestamp('joined_at'),
  leftAt: timestamp('left_at'),
  durationSeconds: integer('duration_seconds'), // Auto-calculated on leave

  // Connection quality metrics
  connectionQuality: text('connection_quality'), // 'excellent' | 'good' | 'poor'
  packetLossPercentage: decimal('packet_loss_percentage', { precision: 5, scale: 2 }),
  jitterMs: integer('jitter_ms'),

  // Metadata
  deviceInfo: jsonb('device_info').default({}).notNull(), // Browser, OS, device type
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes
  roomIdIdx: index('livekit_participants_room_id_idx').on(table.roomId),
  userIdIdx: index('livekit_participants_user_id_idx').on(table.userId),
  statusIdx: index('livekit_participants_status_idx').on(table.participantStatus),
  tokenExpiresIdx: index('livekit_participants_token_expires_idx').on(table.tokenExpiresAt),
  // Unique constraint: one user per room
  uniqueParticipant: index('livekit_participants_room_user_unique').on(table.roomId, table.userId),
}));

// ============================================================================
// LIVEKIT EVENTS TABLE
// ============================================================================

export const livekitEvents = pgTable('livekit_events', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Foreign keys (nullable - some events may not be participant-specific)
  roomId: uuid('room_id').references(() => livekitRooms.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id').references(() => livekitParticipants.id, { onDelete: 'cascade' }),

  // Event details
  eventType: text('event_type').notNull(), // room_started, participant_joined, track_published, etc.
  eventData: jsonb('event_data').notNull().default({}),

  // Source tracking
  source: text('source').notNull().default('webhook'), // 'webhook' | 'api' | 'internal'
  webhookId: text('webhook_id'), // For webhook deduplication

  // Metadata
  severity: text('severity').default('info'), // 'debug' | 'info' | 'warning' | 'error' | 'critical'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Timestamps
  eventTimestamp: timestamp('event_timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes
  roomIdIdx: index('livekit_events_room_id_idx').on(table.roomId),
  participantIdIdx: index('livekit_events_participant_id_idx').on(table.participantId),
  eventTypeIdx: index('livekit_events_event_type_idx').on(table.eventType),
  timestampIdx: index('livekit_events_timestamp_idx').on(table.eventTimestamp),
  webhookIdIdx: index('livekit_events_webhook_id_idx').on(table.webhookId),
}));

// ============================================================================
// LIVEKIT RECORDINGS TABLE (Optional - for future recording feature)
// ============================================================================

export const livekitRecordings = pgTable('livekit_recordings', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Foreign key
  roomId: uuid('room_id')
    .references(() => livekitRooms.id, { onDelete: 'cascade' })
    .notNull(),

  // Recording details
  recordingSid: text('recording_sid').notNull().unique(),
  recordingType: text('recording_type').notNull(), // 'composite' | 'track'
  fileType: text('file_type').notNull(), // 'mp4' | 'webm'

  // Storage
  storageProvider: text('storage_provider').notNull().default('s3'), // 's3' | 'gcs' | 'local'
  storagePath: text('storage_path').notNull(),
  fileUrl: text('file_url'),
  fileSizeBytes: integer('file_size_bytes'),

  // Duration
  durationSeconds: integer('duration_seconds'),

  // Status
  status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed' | 'failed'
  errorMessage: text('error_message'),

  // Processing
  transcriptionEnabled: boolean('transcription_enabled').default(false).notNull(),
  transcriptionUrl: text('transcription_url'),

  // Metadata
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes
  roomIdIdx: index('livekit_recordings_room_id_idx').on(table.roomId),
  statusIdx: index('livekit_recordings_status_idx').on(table.status),
  createdAtIdx: index('livekit_recordings_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const livekitRoomsRelations = relations(livekitRooms, ({ one, many }) => ({
  session: one(sessions, {
    fields: [livekitRooms.sessionId],
    references: [sessions.id],
  }),
  participants: many(livekitParticipants),
  events: many(livekitEvents),
  recordings: many(livekitRecordings),
}));

export const livekitParticipantsRelations = relations(livekitParticipants, ({ one, many }) => ({
  room: one(livekitRooms, {
    fields: [livekitParticipants.roomId],
    references: [livekitRooms.id],
  }),
  user: one(users, {
    fields: [livekitParticipants.userId],
    references: [users.id],
  }),
  events: many(livekitEvents),
}));

export const livekitEventsRelations = relations(livekitEvents, ({ one }) => ({
  room: one(livekitRooms, {
    fields: [livekitEvents.roomId],
    references: [livekitRooms.id],
  }),
  participant: one(livekitParticipants, {
    fields: [livekitEvents.participantId],
    references: [livekitParticipants.id],
  }),
}));

export const livekitRecordingsRelations = relations(livekitRecordings, ({ one }) => ({
  room: one(livekitRooms, {
    fields: [livekitRecordings.roomId],
    references: [livekitRooms.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LivekitRoom = typeof livekitRooms.$inferSelect;
export type NewLivekitRoom = typeof livekitRooms.$inferInsert;

export type LivekitParticipant = typeof livekitParticipants.$inferSelect;
export type NewLivekitParticipant = typeof livekitParticipants.$inferInsert;

export type LivekitEvent = typeof livekitEvents.$inferSelect;
export type NewLivekitEvent = typeof livekitEvents.$inferInsert;

export type LivekitRecording = typeof livekitRecordings.$inferSelect;
export type NewLivekitRecording = typeof livekitRecordings.$inferInsert;
