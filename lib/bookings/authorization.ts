import { BookingServiceError } from './server/errors';
import type {
  ListBookingsInput,
  UpdateBookingInput,
} from './server/schemas';

export interface BookingActorRoleFlags {
  userId: string;
  isAdmin: boolean;
  isMentor: boolean;
  isMentee: boolean;
}

type BookingParticipantRole = 'mentor' | 'mentee';
type BookingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ListBookingsAccessDecision =
  | {
      kind: 'mentor-range';
      mentorId: string;
      start: string;
      end: string;
      status?: string;
    }
  | {
      kind: 'self-mentor';
      status?: string;
    }
  | {
      kind: 'self-mentee';
      status?: string;
    };

const RANGE_FILTER_FIELDS: Array<keyof ListBookingsInput> = [
  'mentorId',
  'start',
  'end',
];

const GENERIC_BOOKING_EDIT_FIELDS: Array<keyof UpdateBookingInput> = [
  'title',
  'description',
  'scheduledAt',
  'duration',
  'meetingType',
  'location',
  'sessionType',
  'mentorRating',
  'menteeRating',
  'cancelledBy',
  'cancellationReason',
];

function hasRoleForRequestedAudience(
  actor: BookingActorRoleFlags,
  audience: BookingParticipantRole
) {
  return audience === 'mentor' ? actor.isMentor : actor.isMentee;
}

export function resolveListBookingsAccess(
  actor: BookingActorRoleFlags,
  input: ListBookingsInput
): ListBookingsAccessDecision {
  const providedRangeFields = RANGE_FILTER_FIELDS.filter(
    (field) => input[field] !== undefined
  );

  if (providedRangeFields.length > 0) {
    if (providedRangeFields.length !== RANGE_FILTER_FIELDS.length) {
      throw new BookingServiceError(
        400,
        'mentorId, start, and end must be provided together'
      );
    }

    if (actor.isAdmin) {
      return {
        kind: 'mentor-range',
        mentorId: input.mentorId!,
        start: input.start!,
        end: input.end!,
        status: input.status,
      };
    }

    if (actor.isMentor && input.mentorId === actor.userId) {
      return {
        kind: 'mentor-range',
        mentorId: input.mentorId!,
        start: input.start!,
        end: input.end!,
        status: input.status,
      };
    }

    throw new BookingServiceError(
      403,
      'You do not have permission to query another mentor’s schedule'
    );
  }

  if (!hasRoleForRequestedAudience(actor, input.role)) {
    throw new BookingServiceError(403, 'Access denied');
  }

  if (input.role === 'mentor') {
    return {
      kind: 'self-mentor',
      status: input.status,
    };
  }

  return {
    kind: 'self-mentee',
    status: input.status,
  };
}

export type AuthorizedBookingUpdate = Pick<
  UpdateBookingInput,
  'status' | 'meetingUrl' | 'mentorNotes' | 'menteeNotes'
>;

function ensureNoDisallowedBookingFields(input: UpdateBookingInput) {
  const disallowedFields = GENERIC_BOOKING_EDIT_FIELDS.filter(
    (field) => input[field] !== undefined
  );

  if (disallowedFields.length === 0) {
    return;
  }

  throw new BookingServiceError(
    403,
    `Use the dedicated booking workflows for: ${disallowedFields.join(', ')}`
  );
}

export function resolveAuthorizedBookingUpdate(args: {
  actorRole: BookingParticipantRole;
  currentStatus: BookingStatus;
  input: UpdateBookingInput;
}): AuthorizedBookingUpdate {
  const { actorRole, currentStatus, input } = args;
  ensureNoDisallowedBookingFields(input);

  const updateData: AuthorizedBookingUpdate = {};

  if (actorRole === 'mentor') {
    if (input.menteeNotes !== undefined) {
      throw new BookingServiceError(
        403,
        'Mentors cannot modify mentee notes'
      );
    }

    if (input.status !== undefined) {
      if (!['in_progress', 'completed'].includes(input.status)) {
        throw new BookingServiceError(
          403,
          'Mentors can only mark sessions as in progress or completed'
        );
      }

      if (input.status === 'in_progress' && currentStatus !== 'scheduled') {
        throw new BookingServiceError(
          400,
          'Only scheduled sessions can be started'
        );
      }

      if (
        input.status === 'completed' &&
        !['scheduled', 'in_progress'].includes(currentStatus)
      ) {
        throw new BookingServiceError(
          400,
          'Only scheduled or in-progress sessions can be completed'
        );
      }

      updateData.status = input.status;
    }

    if (input.meetingUrl !== undefined) {
      updateData.meetingUrl = input.meetingUrl;
    }

    if (input.mentorNotes !== undefined) {
      updateData.mentorNotes = input.mentorNotes;
    }
  } else {
    if (
      input.status !== undefined ||
      input.meetingUrl !== undefined ||
      input.mentorNotes !== undefined
    ) {
      throw new BookingServiceError(
        403,
        'Mentees cannot update session status, meeting links, or mentor notes'
      );
    }

    if (input.menteeNotes !== undefined) {
      updateData.menteeNotes = input.menteeNotes;
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new BookingServiceError(400, 'No authorized booking updates provided');
  }

  return updateData;
}
