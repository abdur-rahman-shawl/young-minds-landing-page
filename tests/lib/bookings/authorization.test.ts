import { describe, expect, it } from 'vitest';

import {
  resolveAuthorizedBookingUpdate,
  resolveListBookingsAccess,
  type BookingActorRoleFlags,
} from '@/lib/bookings/authorization';

const mentorActor: BookingActorRoleFlags = {
  userId: 'mentor-user',
  isAdmin: false,
  isMentor: true,
  isMentee: false,
};

const menteeActor: BookingActorRoleFlags = {
  userId: 'mentee-user',
  isAdmin: false,
  isMentor: false,
  isMentee: true,
};

const adminActor: BookingActorRoleFlags = {
  userId: 'admin-user',
  isAdmin: true,
  isMentor: false,
  isMentee: false,
};

describe('resolveListBookingsAccess', () => {
  it('allows mentors to list their own bookings', () => {
    expect(
      resolveListBookingsAccess(mentorActor, {
        role: 'mentor',
        status: 'scheduled',
      })
    ).toEqual({
      kind: 'self-mentor',
      status: 'scheduled',
    });
  });

  it('allows admins to query a mentor schedule by date range', () => {
    expect(
      resolveListBookingsAccess(adminActor, {
        role: 'mentor',
        mentorId: 'mentor-user',
        start: '2026-04-01T00:00:00.000Z',
        end: '2026-04-07T23:59:59.000Z',
      })
    ).toEqual({
      kind: 'mentor-range',
      mentorId: 'mentor-user',
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-07T23:59:59.000Z',
      status: undefined,
    });
  });

  it('rejects non-admins querying another mentor schedule', () => {
    expect(() =>
      resolveListBookingsAccess(menteeActor, {
        role: 'mentee',
        mentorId: 'mentor-user',
        start: '2026-04-01T00:00:00.000Z',
        end: '2026-04-07T23:59:59.000Z',
      })
    ).toThrowError('You do not have permission to query another mentor’s schedule');
  });

  it('rejects role escalation for self-listing', () => {
    expect(() =>
      resolveListBookingsAccess(menteeActor, {
        role: 'mentor',
      })
    ).toThrowError('Access denied');
  });
});

describe('resolveAuthorizedBookingUpdate', () => {
  it('allows mentors to perform operational session updates', () => {
    expect(
      resolveAuthorizedBookingUpdate({
        actorRole: 'mentor',
        currentStatus: 'scheduled',
        input: {
          bookingId: '74f6a3d7-11ff-46ec-a315-cae6d808a3fe',
          status: 'in_progress',
          meetingUrl: 'https://example.com/room',
          mentorNotes: 'Starting now',
        },
      })
    ).toEqual({
      status: 'in_progress',
      meetingUrl: 'https://example.com/room',
      mentorNotes: 'Starting now',
    });
  });

  it('rejects generic booking edits through the operational update endpoint', () => {
    expect(() =>
      resolveAuthorizedBookingUpdate({
        actorRole: 'mentor',
        currentStatus: 'scheduled',
        input: {
          bookingId: '74f6a3d7-11ff-46ec-a315-cae6d808a3fe',
          title: 'Changed title',
        } as any,
      })
    ).toThrowError('Use the dedicated booking workflows for: title');
  });

  it('rejects mentees changing session status', () => {
    expect(() =>
      resolveAuthorizedBookingUpdate({
        actorRole: 'mentee',
        currentStatus: 'scheduled',
        input: {
          bookingId: '74f6a3d7-11ff-46ec-a315-cae6d808a3fe',
          status: 'completed',
        },
      })
    ).toThrowError(
      'Mentees cannot update session status, meeting links, or mentor notes'
    );
  });

  it('allows mentees to update only their own notes', () => {
    expect(
      resolveAuthorizedBookingUpdate({
        actorRole: 'mentee',
        currentStatus: 'scheduled',
        input: {
          bookingId: '74f6a3d7-11ff-46ec-a315-cae6d808a3fe',
          menteeNotes: 'Need to discuss system design',
        },
      })
    ).toEqual({
      menteeNotes: 'Need to discuss system design',
    });
  });
});
