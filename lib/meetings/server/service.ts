import { eq } from 'drizzle-orm';

import { assertAccountAccess } from '@/lib/access-policy/server';
import { db } from '@/lib/db';
import { livekitRooms, sessions } from '@/lib/db/schema';
import { AppHttpError } from '@/lib/http/app-error';
import { livekitConfig } from '@/lib/livekit/config';
import {
  resolveMeetingJoinWindow,
  resolveMeetingParticipantRole,
  type MeetingParticipantRole,
} from '@/lib/meetings/access';

interface MeetingParticipantRecord {
  name: string | null;
  email: string;
}

interface MeetingSessionRecord {
  mentorId: string | null;
  menteeId: string | null;
  title: string;
  scheduledAt: Date;
  mentor: MeetingParticipantRecord | null;
  mentee: MeetingParticipantRecord | null;
}

export interface MeetingJoinContext {
  sessionId: string;
  sessionTitle: string;
  userRole: MeetingParticipantRole;
  otherParticipantName: string;
}

function getMeetingStatePayload(
  state: string,
  extra: Record<string, unknown> = {}
) {
  return {
    state,
    ...extra,
  };
}

function resolveParticipantRole(
  sessionData: MeetingSessionRecord,
  userId: string
): MeetingParticipantRole {
  const participantRole = resolveMeetingParticipantRole({
    userId,
    mentorId: sessionData.mentorId,
    menteeId: sessionData.menteeId,
  });

  if (!participantRole) {
    throw new AppHttpError(
      403,
      'You are not authorized to access this meeting',
      getMeetingStatePayload('meeting_access_denied', {
        reasonCode: 'session_participant_required',
      })
    );
  }

  return participantRole;
}

function getOtherParticipantName(
  sessionData: MeetingSessionRecord,
  participantRole: MeetingParticipantRole
) {
  const participant =
    participantRole === 'mentor' ? sessionData.mentee : sessionData.mentor;

  return participant?.name || participant?.email || 'Participant';
}

export async function getMeetingJoinContext(
  sessionId: string,
  userId: string
): Promise<MeetingJoinContext> {
  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      mentor: true,
      mentee: true,
    },
  });

  if (!sessionData) {
    throw new AppHttpError(
      404,
      'Session not found',
      getMeetingStatePayload('session_not_found', {
        reasonCode: 'session_not_found',
      })
    );
  }

  if (!sessionData.mentor || !sessionData.mentee) {
    throw new AppHttpError(
      404,
      'Associated session participants could not be found',
      getMeetingStatePayload('session_not_found', {
        reasonCode: 'session_participants_missing',
      })
    );
  }

  const participantRole = resolveParticipantRole(sessionData, userId);

  await assertAccountAccess({
    userId,
    source: 'meetings.join',
  });

  const joinWindow = resolveMeetingJoinWindow({
    scheduledAt: sessionData.scheduledAt,
    earlyJoinMinutes: livekitConfig.meeting.earlyJoinMinutes,
    lateJoinMaxHours: livekitConfig.meeting.lateJoinMaxHours,
  });

  if (joinWindow.status === 'too_early') {
    throw new AppHttpError(
      409,
      'Meeting not started yet',
      getMeetingStatePayload('meeting_too_early', {
        reasonCode: 'meeting_not_started',
        title: sessionData.title,
        scheduledAt: joinWindow.scheduledTime.toISOString(),
        earlyJoinTime: joinWindow.earlyJoinTime.toISOString(),
        minutesUntil: joinWindow.minutesUntil,
      })
    );
  }

  if (joinWindow.status === 'expired') {
    throw new AppHttpError(
      410,
      'Meeting has ended',
      getMeetingStatePayload('meeting_expired', {
        reasonCode: 'meeting_expired',
        title: sessionData.title,
        scheduledAt: joinWindow.scheduledTime.toISOString(),
        lateJoinTime: joinWindow.lateJoinTime.toISOString(),
      })
    );
  }

  const room = await db.query.livekitRooms.findFirst({
    where: eq(livekitRooms.sessionId, sessionId),
  });

  if (!room) {
    throw new AppHttpError(
      409,
      'Meeting room not ready',
      getMeetingStatePayload('meeting_room_not_ready', {
        reasonCode: 'meeting_room_not_ready',
      })
    );
  }

  return {
    sessionId,
    sessionTitle: sessionData.title,
    userRole: participantRole,
    otherParticipantName: getOtherParticipantName(sessionData, participantRole),
  };
}
