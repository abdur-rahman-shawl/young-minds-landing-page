export type MeetingParticipantRole = 'mentor' | 'mentee';

interface ResolveMeetingParticipantRoleInput {
  userId: string;
  mentorId: string | null;
  menteeId: string | null;
}

interface ResolveMeetingJoinWindowInput {
  scheduledAt: Date | string;
  now?: Date;
  earlyJoinMinutes: number;
  lateJoinMaxHours: number;
}

type MeetingJoinWindowStatus =
  | {
      status: 'ok';
      scheduledTime: Date;
      earlyJoinTime: Date;
      lateJoinTime: Date;
    }
  | {
      status: 'too_early';
      scheduledTime: Date;
      earlyJoinTime: Date;
      lateJoinTime: Date;
      minutesUntil: number;
    }
  | {
      status: 'expired';
      scheduledTime: Date;
      earlyJoinTime: Date;
      lateJoinTime: Date;
    };

export function resolveMeetingParticipantRole(
  input: ResolveMeetingParticipantRoleInput
): MeetingParticipantRole | null {
  if (input.userId === input.mentorId) {
    return 'mentor';
  }

  if (input.userId === input.menteeId) {
    return 'mentee';
  }

  return null;
}

export function resolveMeetingJoinWindow(
  input: ResolveMeetingJoinWindowInput
): MeetingJoinWindowStatus {
  const scheduledTime =
    input.scheduledAt instanceof Date
      ? new Date(input.scheduledAt)
      : new Date(input.scheduledAt);

  if (Number.isNaN(scheduledTime.getTime())) {
    throw new Error('Invalid scheduled meeting time');
  }

  const now = input.now ?? new Date();
  const earlyJoinTime = new Date(
    scheduledTime.getTime() - input.earlyJoinMinutes * 60 * 1000
  );
  const lateJoinTime = new Date(
    scheduledTime.getTime() + input.lateJoinMaxHours * 60 * 60 * 1000
  );

  if (now < earlyJoinTime) {
    return {
      status: 'too_early',
      scheduledTime,
      earlyJoinTime,
      lateJoinTime,
      minutesUntil: Math.ceil(
        (earlyJoinTime.getTime() - now.getTime()) / (1000 * 60)
      ),
    };
  }

  if (now > lateJoinTime) {
    return {
      status: 'expired',
      scheduledTime,
      earlyJoinTime,
      lateJoinTime,
    };
  }

  return {
    status: 'ok',
    scheduledTime,
    earlyJoinTime,
    lateJoinTime,
  };
}
