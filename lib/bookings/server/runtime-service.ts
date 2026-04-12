import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { canViewSessionDetail } from '@/lib/bookings/session-access';

import { assertBooking } from './errors';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

async function getRuntimeUser(
  userId: string,
  currentUser?: CurrentUser
): Promise<CurrentUser> {
  const resolvedUser = currentUser ?? (await getUserWithRoles(userId));
  assertBooking(resolvedUser, 401, 'Authentication required');
  return resolvedUser;
}

export async function getSessionView(
  actorUserId: string,
  sessionId: string,
  currentUser?: CurrentUser
) {
  const actor = await getRuntimeUser(actorUserId, currentUser);
  const mentorUser = alias(users, 'mentor');
  const menteeUser = alias(users, 'mentee');

  const [session] = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      mentorId: sessions.mentorId,
      menteeId: sessions.menteeId,
      meetingUrl: sessions.meetingUrl,
      meetingType: sessions.meetingType,
      mentor: {
        id: mentorUser.id,
        name: mentorUser.name,
        image: mentorUser.image,
      },
      mentee: {
        id: menteeUser.id,
        name: menteeUser.name,
        image: menteeUser.image,
      },
    })
    .from(sessions)
    .leftJoin(mentorUser, eq(sessions.mentorId, mentorUser.id))
    .leftJoin(menteeUser, eq(sessions.menteeId, menteeUser.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  assertBooking(session, 404, 'Session not found');
  assertBooking(
    session.mentor && session.mentee,
    404,
    'Associated user for this session could not be found.'
  );

  const isAdmin = actor.roles.some((role) => role.name === 'admin');
  assertBooking(
    canViewSessionDetail({
      actorUserId,
      mentorId: session.mentorId,
      menteeId: session.menteeId,
      isAdmin,
    }),
    403,
    'Forbidden'
  );

  return session;
}

export async function listMentorPendingReviews(
  actorUserId: string,
  currentUser?: CurrentUser
) {
  const actor = await getRuntimeUser(actorUserId, currentUser);
  const roleNames = new Set(actor.roles.map((role) => role.name));
  assertBooking(
    roleNames.has('mentor') || roleNames.has('admin'),
    403,
    'Mentor access required'
  );

  const rows = await db
    .select({
      sessionId: sessions.id,
      sessionTitle: sessions.title,
      sessionEndedAt: sessions.endedAt,
      mentee: {
        id: users.id,
        name: users.name,
        avatar: users.image,
      },
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.menteeId, users.id))
    .where(
      and(
        eq(sessions.mentorId, actorUserId),
        eq(sessions.status, 'completed'),
        eq(sessions.isReviewedByMentor, false)
      )
    )
    .orderBy(desc(sessions.endedAt));

  return {
    data: rows,
  };
}

export async function listMenteePendingReviews(
  actorUserId: string,
  currentUser?: CurrentUser
) {
  const actor = await getRuntimeUser(actorUserId, currentUser);
  const roleNames = new Set(actor.roles.map((role) => role.name));
  assertBooking(
    roleNames.has('mentee') || roleNames.has('admin'),
    403,
    'Mentee access required'
  );

  const rows = await db
    .select({
      sessionId: sessions.id,
      sessionTitle: sessions.title,
      sessionEndedAt: sessions.endedAt,
      mentor: {
        id: users.id,
        name: users.name,
        avatar: users.image,
      },
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.mentorId, users.id))
    .where(
      and(
        eq(sessions.menteeId, actorUserId),
        eq(sessions.status, 'completed'),
        eq(sessions.isReviewedByMentee, false)
      )
    )
    .orderBy(desc(sessions.endedAt));

  return {
    data: rows,
  };
}
