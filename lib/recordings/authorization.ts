export type RecordingAccessAction =
  | 'recordings.access.mentor'
  | 'recordings.access.mentee';

interface ResolveRecordingPlaybackAccessInput {
  userId: string;
  mentorId: string;
  menteeId: string;
}

export function resolveRecordingPlaybackAccess(
  input: ResolveRecordingPlaybackAccessInput
): RecordingAccessAction {
  if (input.userId === input.mentorId) {
    return 'recordings.access.mentor';
  }

  if (input.userId === input.menteeId) {
    return 'recordings.access.mentee';
  }

  throw new Error(
    `UNAUTHORIZED: User ${input.userId} is not authorized to view this recording. ` +
      'Only session participants can access recordings.'
  );
}
