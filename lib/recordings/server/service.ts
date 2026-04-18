import { eq } from 'drizzle-orm';

import {
  assertMenteeFeatureAccess,
  assertMentorFeatureAccess,
} from '@/lib/access-policy/server';
import { db } from '@/lib/db';
import { livekitRecordings, livekitRooms, sessions } from '@/lib/db/schema';
import { AppHttpError } from '@/lib/http/app-error';
import { getPlaybackUrl } from '@/lib/livekit/recording-manager';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { getMeetingJoinContext } from '@/lib/meetings/server/service';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';
import {
  enforceFeature,
  isSubscriptionPolicyError,
} from '@/lib/subscriptions/policy-runtime';

async function assertRecordingFeatureAccess(
  sessionData: { mentorId: string | null; menteeId: string | null },
  userId: string
): Promise<'mentor' | 'mentee'> {
  if (sessionData.mentorId === userId) {
    await assertMentorFeatureAccess({
      userId,
      feature: MENTOR_FEATURE_KEYS.recordingsView,
      source: 'recordings.view',
    });
    return 'mentor';
  }

  if (sessionData.menteeId === userId) {
    await assertMenteeFeatureAccess({
      userId,
      feature: MENTEE_FEATURE_KEYS.recordingsView,
      source: 'recordings.view',
    });
    return 'mentee';
  }

  throw new AppHttpError(403, 'You are not authorized to access this recording', {
    reasonCode: 'session_participant_required',
    state: 'recording_access_denied',
  });
}

async function enforceRecordingSubscriptionAccess(
  userId: string,
  participantRole: 'mentor' | 'mentee'
) {
  try {
    await enforceFeature({
      action:
        participantRole === 'mentor'
          ? 'recordings.access.mentor'
          : 'recordings.access.mentee',
      userId,
    });
  } catch (error) {
    if (isSubscriptionPolicyError(error)) {
      throw new AppHttpError(
        error.status,
        typeof error.payload?.error === 'string'
          ? error.payload.error
          : 'Session recordings are not included in your plan',
        {
          reasonCode: 'feature_not_in_plan',
          state: 'recording_access_denied',
        }
      );
    }

    throw error;
  }
}

async function getAccessibleRecording(recordingId: string, userId: string) {
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

  if (!recording?.room?.session) {
    throw new AppHttpError(404, 'Recording not found', {
      reasonCode: 'recording_not_found',
      state: 'recording_not_found',
    });
  }

  const sessionData = recording.room.session;
  const participantRole = await assertRecordingFeatureAccess(sessionData, userId);
  await enforceRecordingSubscriptionAccess(userId, participantRole);

  if (recording.status === 'failed') {
    throw new AppHttpError(409, 'Recording failed', {
      reasonCode: 'recording_failed',
      state: 'recording_failed',
      errorMessage: recording.errorMessage ?? null,
    });
  }

  if (recording.status !== 'completed') {
    throw new AppHttpError(423, 'Recording is still being processed', {
      reasonCode: 'recording_processing',
      state: 'recording_processing',
      recordingStatus: recording.status,
    });
  }

  return {
    recording,
    sessionData,
  };
}

export async function getSessionAccessToken(sessionId: string, userId: string) {
  await getMeetingJoinContext(sessionId, userId);

  try {
    return await LiveKitRoomManager.generateAccessToken(sessionId, userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate access token';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      throw new AppHttpError(403, 'You are not authorized to join this meeting', {
        reasonCode: 'session_participant_required',
        state: 'meeting_access_denied',
      });
    }

    if (message.includes('No LiveKit room found')) {
      throw new AppHttpError(404, 'Meeting room not found', {
        reasonCode: 'meeting_room_not_ready',
        state: 'meeting_room_not_ready',
      });
    }

    throw error;
  }
}

export async function listSessionRecordings(sessionId: string, userId: string) {
  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!sessionData) {
    throw new AppHttpError(404, 'Session not found', {
      reasonCode: 'session_not_found',
    });
  }

  const participantRole = await assertRecordingFeatureAccess(sessionData, userId);
  await enforceRecordingSubscriptionAccess(userId, participantRole);

  const room = await db.query.livekitRooms.findFirst({
    where: eq(livekitRooms.sessionId, sessionId),
    with: {
      recordings: true,
    },
  });

  if (!room) {
    return [];
  }

  return room.recordings.map((recording) => ({
    id: recording.id,
    status: recording.status,
    durationSeconds: recording.durationSeconds,
    fileSizeBytes: recording.fileSizeBytes,
    createdAt: recording.createdAt,
    startedAt: recording.startedAt,
    completedAt: recording.completedAt,
    errorMessage: recording.errorMessage,
  }));
}

export async function getRecordingPlaybackPageView(
  recordingId: string,
  userId: string
) {
  const { recording, sessionData } = await getAccessibleRecording(
    recordingId,
    userId
  );

  return {
    recordingId: recording.id,
    sessionTitle: sessionData.title,
    durationSeconds: recording.durationSeconds || 0,
    fileSizeBytes: recording.fileSizeBytes || 0,
    recordedAt: recording.createdAt,
  };
}

export async function getRecordingPlaybackUrl(recordingId: string, userId: string) {
  const { recording } = await getAccessibleRecording(recordingId, userId);

  try {
    const playbackUrl = await getPlaybackUrl(recording.id, userId);

    return {
      playbackUrl,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      expiresIn: 3600,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate playback URL';

    if (message.includes('not authorized') || message.includes('UNAUTHORIZED')) {
      throw new AppHttpError(403, 'You are not authorized to access this recording');
    }

    if (message.includes('not found')) {
      throw new AppHttpError(404, 'Recording not found', {
        reasonCode: 'recording_not_found',
        state: 'recording_not_found',
      });
    }

    if (message.includes('not ready') || message.includes('status:')) {
      throw new AppHttpError(423, 'Recording is still being processed', {
        reasonCode: 'recording_processing',
        state: 'recording_processing',
      });
    }

    throw error;
  }
}
