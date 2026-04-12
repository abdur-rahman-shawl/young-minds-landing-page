import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  buildAdminAverageSessionRatingSelection,
  normalizeAdminAverageSessionRating,
} from '@/lib/bookings/admin-stats';
import type { TRPCContext } from '@/lib/trpc/context';
import { db } from '@/lib/db';
import {
  adminSessionAuditTrail,
  adminSessionNotes,
  mentors,
  rescheduleRequests,
  reviews,
  sessions,
  users,
} from '@/lib/db/schema';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { userHasRole } from '@/lib/db/user-helpers';
import {
  assertAdminAccess,
  assertAdminCanReassign,
  resolveAdminCancellation,
  resolveAdminClearNoShow,
  resolveAdminCompletion,
  resolveAdminRefund,
} from '@/lib/bookings/admin-rules';
import {
  assertBooking,
} from './errors';
import type {
  AdminAddBookingNoteInput,
  AdminCancelBookingInput,
  AdminClearNoShowInput,
  AdminCompleteBookingInput,
  AdminGetBookingInput,
  AdminListBookingNotesInput,
  AdminListBookingsInput,
  AdminReassignBookingInput,
  AdminRefundBookingInput,
  AdminSessionStatsInput,
} from './schemas';
import {
  adminAddBookingNoteInputSchema,
  adminCancelBookingInputSchema,
  adminClearNoShowInputSchema,
  adminCompleteBookingInputSchema,
  adminGetBookingInputSchema,
  adminListBookingNotesInputSchema,
  adminListBookingsInputSchema,
  adminReassignBookingInputSchema,
  adminRefundBookingInputSchema,
  adminSessionStatsInputSchema,
} from './schemas';

type AuthenticatedContext = TRPCContext & {
  session: NonNullable<TRPCContext['session']>;
  userId: string;
  isAdmin?: boolean;
};

function getRequestIp(context: AuthenticatedContext) {
  return (
    context.req.headers.get('x-forwarded-for') ??
    context.req.headers.get('x-real-ip') ??
    undefined
  );
}

function getRequestUserAgent(context: AuthenticatedContext) {
  return context.req.headers.get('user-agent') ?? undefined;
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function ensureAdminContext(context: AuthenticatedContext) {
  assertBooking(context.userId && context.session?.user, 401, 'Authentication required');

  if (context.isAdmin) {
    return;
  }

  const isAdmin = await userHasRole(context.userId, 'admin');
  assertAdminAccess(isAdmin);
}

export async function listAdminBookings(
  context: AuthenticatedContext,
  input: AdminListBookingsInput
) {
  await ensureAdminContext(context);
  const parsed = adminListBookingsInputSchema.parse(input);

  const mentorUser = alias(users, 'admin_sessions_mentor_user');
  const menteeUser = alias(users, 'admin_sessions_mentee_user');
  const conditions = [];

  if (parsed.status?.length) {
    conditions.push(inArray(sessions.status, parsed.status));
  }

  if (parsed.mentorId) {
    conditions.push(eq(sessions.mentorId, parsed.mentorId));
  }

  if (parsed.menteeId) {
    conditions.push(eq(sessions.menteeId, parsed.menteeId));
  }

  if (parsed.startDate) {
    conditions.push(gte(sessions.scheduledAt, new Date(parsed.startDate)));
  }

  if (parsed.endDate) {
    conditions.push(lte(sessions.scheduledAt, new Date(parsed.endDate)));
  }

  if (parsed.meetingType) {
    conditions.push(eq(sessions.meetingType, parsed.meetingType));
  }

  if (parsed.refundStatus) {
    conditions.push(eq(sessions.refundStatus, parsed.refundStatus));
  }

  if (parsed.wasReassigned !== undefined) {
    conditions.push(eq(sessions.wasReassigned, parsed.wasReassigned));
  }

  if (parsed.search) {
    const searchTerm = `%${parsed.search}%`;
    conditions.push(
      or(
        like(sessions.title, searchTerm),
        like(sql`COALESCE(${sessions.description}, '')`, searchTerm),
        like(sql`COALESCE(${mentorUser.name}, '')`, searchTerm),
        like(sql`COALESCE(${mentorUser.email}, '')`, searchTerm),
        like(sql`COALESCE(${menteeUser.name}, '')`, searchTerm),
        like(sql`COALESCE(${menteeUser.email}, '')`, searchTerm)
      )
    );
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (parsed.page - 1) * parsed.limit;
  const sortColumn = {
    scheduledAt: sessions.scheduledAt,
    createdAt: sessions.createdAt,
    updatedAt: sessions.updatedAt,
    status: sessions.status,
  }[parsed.sortBy];

  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(sessions)
    .leftJoin(mentorUser, eq(sessions.mentorId, mentorUser.id))
    .leftJoin(menteeUser, eq(sessions.menteeId, menteeUser.id))
    .where(whereCondition);

  const sessionsData = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      description: sessions.description,
      status: sessions.status,
      scheduledAt: sessions.scheduledAt,
      duration: sessions.duration,
      meetingType: sessions.meetingType,
      rate: sessions.rate,
      currency: sessions.currency,
      cancelledBy: sessions.cancelledBy,
      cancellationReason: sessions.cancellationReason,
      rescheduleCount: sessions.rescheduleCount,
      mentorRescheduleCount: sessions.mentorRescheduleCount,
      refundAmount: sessions.refundAmount,
      refundPercentage: sessions.refundPercentage,
      refundStatus: sessions.refundStatus,
      wasReassigned: sessions.wasReassigned,
      reassignmentStatus: sessions.reassignmentStatus,
      pendingRescheduleBy: sessions.pendingRescheduleBy,
      createdAt: sessions.createdAt,
      mentorId: sessions.mentorId,
      menteeId: sessions.menteeId,
      mentorName: mentorUser.name,
      mentorEmail: mentorUser.email,
      mentorImage: mentorUser.image,
      menteeName: menteeUser.name,
      menteeEmail: menteeUser.email,
      menteeImage: menteeUser.image,
    })
    .from(sessions)
    .leftJoin(mentorUser, eq(sessions.mentorId, mentorUser.id))
    .leftJoin(menteeUser, eq(sessions.menteeId, menteeUser.id))
    .where(whereCondition)
    .orderBy(parsed.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
    .limit(parsed.limit)
    .offset(offset);

  return {
    sessions: sessionsData.map((session) => ({
      id: session.id,
      title: session.title,
      description: session.description,
      status: session.status,
      scheduledAt: session.scheduledAt.toISOString(),
      duration: session.duration,
      meetingType: session.meetingType,
      rate: session.rate,
      currency: session.currency,
      cancelledBy: session.cancelledBy,
      cancellationReason: session.cancellationReason,
      rescheduleCount: session.rescheduleCount,
      mentorRescheduleCount: session.mentorRescheduleCount,
      refundAmount: session.refundAmount,
      refundPercentage: session.refundPercentage,
      refundStatus: session.refundStatus,
      wasReassigned: session.wasReassigned,
      reassignmentStatus: session.reassignmentStatus,
      pendingRescheduleBy: session.pendingRescheduleBy,
      createdAt: session.createdAt.toISOString(),
      mentor: session.mentorId
        ? {
            id: session.mentorId,
            name: session.mentorName,
            email: session.mentorEmail,
            image: session.mentorImage,
          }
        : null,
      mentee: session.menteeId
        ? {
            id: session.menteeId,
            name: session.menteeName,
            email: session.menteeEmail,
            image: session.menteeImage,
          }
        : null,
    })),
    pagination: {
      page: parsed.page,
      limit: parsed.limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / parsed.limit)),
    },
  };
}

export async function getAdminSessionStats(
  context: AuthenticatedContext,
  input: AdminSessionStatsInput
) {
  await ensureAdminContext(context);
  const parsed = adminSessionStatsInputSchema.parse(input);

  const sessionDateConditions = [];
  if (parsed.startDate) {
    sessionDateConditions.push(gte(sessions.createdAt, new Date(parsed.startDate)));
  }
  if (parsed.endDate) {
    sessionDateConditions.push(lte(sessions.createdAt, new Date(parsed.endDate)));
  }
  const sessionDateWhere =
    sessionDateConditions.length > 0 ? and(...sessionDateConditions) : undefined;

  const [{ totalSessions }] = await db
    .select({ totalSessions: count() })
    .from(sessions)
    .where(sessionDateWhere);

  const statusCounts = await db
    .select({
      status: sessions.status,
      count: count(),
    })
    .from(sessions)
    .where(sessionDateWhere)
    .groupBy(sessions.status);

  const statusMap: Record<string, number> = {};
  statusCounts.forEach(({ status, count: statusCount }) => {
    statusMap[status] = statusCount;
  });

  const completedSessions = statusMap.completed ?? 0;
  const cancelledSessions = statusMap.cancelled ?? 0;
  const noShowCount = statusMap.no_show ?? 0;
  const scheduledSessions = statusMap.scheduled ?? 0;
  const inProgressSessions = statusMap.in_progress ?? 0;
  const noShowRate =
    totalSessions > 0 ? Math.round((noShowCount / totalSessions) * 10000) / 100 : 0;

  const [revenueData] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.status} = 'completed' THEN CAST(${sessions.rate} AS DECIMAL) ELSE 0 END), 0)`,
      refundsIssued: sql<number>`COALESCE(SUM(CASE WHEN ${sessions.refundStatus} = 'processed' THEN CAST(${sessions.refundAmount} AS DECIMAL) ELSE 0 END), 0)`,
    })
    .from(sessions)
    .where(sessionDateWhere);

  const totalRevenue = Number(revenueData?.totalRevenue) || 0;
  const refundsIssued = Number(revenueData?.refundsIssued) || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [{ sessionsToday }] = await db
    .select({ sessionsToday: count() })
    .from(sessions)
    .where(and(gte(sessions.scheduledAt, today), lte(sessions.scheduledAt, tomorrow)));

  const [{ pendingReschedules }] = await db
    .select({ pendingReschedules: count() })
    .from(sessions)
    .where(sql`${sessions.pendingRescheduleRequestId} IS NOT NULL`);

  const cancellationConditions = [eq(sessions.status, 'cancelled')];
  if (parsed.startDate) {
    cancellationConditions.push(gte(sessions.createdAt, new Date(parsed.startDate)));
  }
  if (parsed.endDate) {
    cancellationConditions.push(lte(sessions.createdAt, new Date(parsed.endDate)));
  }

  const cancellationsByRole = await db
    .select({
      cancelledBy: sessions.cancelledBy,
      count: count(),
    })
    .from(sessions)
    .where(and(...cancellationConditions))
    .groupBy(sessions.cancelledBy);

  const reviewDateConditions = [];
  if (parsed.startDate) {
    reviewDateConditions.push(gte(reviews.createdAt, new Date(parsed.startDate)));
  }
  if (parsed.endDate) {
    reviewDateConditions.push(lte(reviews.createdAt, new Date(parsed.endDate)));
  }
  const reviewWhere =
    reviewDateConditions.length > 0 ? and(...reviewDateConditions) : undefined;

  const [ratingData] = await db
    .select(buildAdminAverageSessionRatingSelection())
    .from(reviews)
    .where(reviewWhere);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessionsOverTime = await db
    .select({
      date: sql<string>`DATE(${sessions.createdAt})`,
      count: count(),
    })
    .from(sessions)
    .where(gte(sessions.createdAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${sessions.createdAt})`)
    .orderBy(sql`DATE(${sessions.createdAt})`);

  return {
    totalSessions,
    completedSessions,
    cancelledSessions,
    noShowCount,
    noShowRate,
    avgSessionRating: normalizeAdminAverageSessionRating(ratingData?.avgRating),
    totalRevenue,
    refundsIssued,
    netRevenue: totalRevenue - refundsIssued,
    sessionsToday,
    pendingReschedules,
    cancellationsByMentor:
      cancellationsByRole.find((item) => item.cancelledBy === 'mentor')?.count ?? 0,
    cancellationsByMentee:
      cancellationsByRole.find((item) => item.cancelledBy === 'mentee')?.count ?? 0,
    statusBreakdown: [
      { status: 'scheduled', count: scheduledSessions },
      { status: 'in_progress', count: inProgressSessions },
      { status: 'completed', count: completedSessions },
      { status: 'cancelled', count: cancelledSessions },
      { status: 'no_show', count: noShowCount },
    ].filter((item) => item.count > 0),
    sessionsOverTime: sessionsOverTime.map((item) => ({
      date: item.date,
      count: item.count,
    })),
  };
}

export async function getAdminBookingDetail(
  context: AuthenticatedContext,
  input: AdminGetBookingInput
) {
  await ensureAdminContext(context);
  const parsed = adminGetBookingInputSchema.parse(input);

  const mentorUser = alias(users, 'admin_detail_mentor_user');
  const menteeUser = alias(users, 'admin_detail_mentee_user');
  const noteAdminUser = alias(users, 'admin_note_user');
  const auditAdminUser = alias(users, 'admin_audit_user');

  const [sessionData] = await db
    .select({
      id: sessions.id,
      mentorId: sessions.mentorId,
      menteeId: sessions.menteeId,
      title: sessions.title,
      description: sessions.description,
      status: sessions.status,
      scheduledAt: sessions.scheduledAt,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      duration: sessions.duration,
      meetingUrl: sessions.meetingUrl,
      meetingType: sessions.meetingType,
      rate: sessions.rate,
      currency: sessions.currency,
      cancelledBy: sessions.cancelledBy,
      cancellationReason: sessions.cancellationReason,
      rescheduleCount: sessions.rescheduleCount,
      mentorRescheduleCount: sessions.mentorRescheduleCount,
      refundAmount: sessions.refundAmount,
      refundPercentage: sessions.refundPercentage,
      refundStatus: sessions.refundStatus,
      wasReassigned: sessions.wasReassigned,
      reassignedFromMentorId: sessions.reassignedFromMentorId,
      reassignedAt: sessions.reassignedAt,
      reassignmentStatus: sessions.reassignmentStatus,
      pendingRescheduleBy: sessions.pendingRescheduleBy,
      pendingRescheduleRequestId: sessions.pendingRescheduleRequestId,
      pendingRescheduleTime: sessions.pendingRescheduleTime,
      noShowMarkedAt: sessions.noShowMarkedAt,
      noShowMarkedBy: sessions.noShowMarkedBy,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      mentorName: mentorUser.name,
      mentorEmail: mentorUser.email,
      mentorImage: mentorUser.image,
      menteeName: menteeUser.name,
      menteeEmail: menteeUser.email,
      menteeImage: menteeUser.image,
    })
    .from(sessions)
    .leftJoin(mentorUser, eq(sessions.mentorId, mentorUser.id))
    .leftJoin(menteeUser, eq(sessions.menteeId, menteeUser.id))
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const [rescheduleRequestsData, adminNotes, adminActions] = await Promise.all([
    db
      .select()
      .from(rescheduleRequests)
      .where(eq(rescheduleRequests.sessionId, parsed.bookingId))
      .orderBy(desc(rescheduleRequests.createdAt)),
    db
      .select({
        id: adminSessionNotes.id,
        note: adminSessionNotes.note,
        adminId: adminSessionNotes.adminId,
        adminName: noteAdminUser.name,
        createdAt: adminSessionNotes.createdAt,
        updatedAt: adminSessionNotes.updatedAt,
      })
      .from(adminSessionNotes)
      .leftJoin(noteAdminUser, eq(adminSessionNotes.adminId, noteAdminUser.id))
      .where(eq(adminSessionNotes.sessionId, parsed.bookingId))
      .orderBy(desc(adminSessionNotes.createdAt)),
    db
      .select({
        id: adminSessionAuditTrail.id,
        adminId: adminSessionAuditTrail.adminId,
        adminName: auditAdminUser.name,
        action: adminSessionAuditTrail.action,
        previousStatus: adminSessionAuditTrail.previousStatus,
        newStatus: adminSessionAuditTrail.newStatus,
        reason: adminSessionAuditTrail.reason,
        details: adminSessionAuditTrail.details,
        ipAddress: adminSessionAuditTrail.ipAddress,
        userAgent: adminSessionAuditTrail.userAgent,
        createdAt: adminSessionAuditTrail.createdAt,
      })
      .from(adminSessionAuditTrail)
      .leftJoin(auditAdminUser, eq(adminSessionAuditTrail.adminId, auditAdminUser.id))
      .where(eq(adminSessionAuditTrail.sessionId, parsed.bookingId))
      .orderBy(desc(adminSessionAuditTrail.createdAt))
      .limit(50),
  ]);

  return {
    session: {
      id: sessionData.id,
      mentorId: sessionData.mentorId,
      menteeId: sessionData.menteeId,
      title: sessionData.title,
      description: sessionData.description,
      status: sessionData.status,
      scheduledAt: sessionData.scheduledAt.toISOString(),
      startedAt: serializeDate(sessionData.startedAt),
      endedAt: serializeDate(sessionData.endedAt),
      duration: sessionData.duration,
      meetingUrl: sessionData.meetingUrl,
      meetingType: sessionData.meetingType,
      rate: sessionData.rate,
      currency: sessionData.currency,
      cancelledBy: sessionData.cancelledBy,
      cancellationReason: sessionData.cancellationReason,
      rescheduleCount: sessionData.rescheduleCount,
      mentorRescheduleCount: sessionData.mentorRescheduleCount,
      refundAmount: sessionData.refundAmount,
      refundPercentage: sessionData.refundPercentage,
      refundStatus: sessionData.refundStatus,
      wasReassigned: sessionData.wasReassigned,
      reassignedFromMentorId: sessionData.reassignedFromMentorId,
      reassignedAt: serializeDate(sessionData.reassignedAt),
      reassignmentStatus: sessionData.reassignmentStatus,
      pendingRescheduleBy: sessionData.pendingRescheduleBy,
      pendingRescheduleRequestId: sessionData.pendingRescheduleRequestId,
      pendingRescheduleTime: serializeDate(sessionData.pendingRescheduleTime),
      noShowMarkedAt: serializeDate(sessionData.noShowMarkedAt),
      noShowMarkedBy: sessionData.noShowMarkedBy,
      createdAt: sessionData.createdAt.toISOString(),
      updatedAt: sessionData.updatedAt.toISOString(),
    },
    mentor: sessionData.mentorId
      ? {
          id: sessionData.mentorId,
          name: sessionData.mentorName,
          email: sessionData.mentorEmail,
          image: sessionData.mentorImage,
        }
      : null,
    mentee: sessionData.menteeId
      ? {
          id: sessionData.menteeId,
          name: sessionData.menteeName,
          email: sessionData.menteeEmail,
          image: sessionData.menteeImage,
        }
      : null,
    rescheduleRequests: rescheduleRequestsData.map((item) => ({
      ...item,
      proposedTime: serializeDate(item.proposedTime),
      originalTime: serializeDate(item.originalTime),
      counterProposedTime: serializeDate(item.counterProposedTime),
      resolvedAt: serializeDate(item.resolvedAt),
      expiresAt: serializeDate(item.expiresAt),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    adminNotes: adminNotes.map((item) => ({
      id: item.id,
      note: item.note,
      adminId: item.adminId,
      adminName: item.adminName,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    adminActions: adminActions.map((item) => ({
      id: item.id,
      adminId: item.adminId,
      adminName: item.adminName,
      action: item.action,
      previousStatus: item.previousStatus,
      newStatus: item.newStatus,
      reason: item.reason,
      details: item.details,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function adminCancelBooking(
  context: AuthenticatedContext,
  input: AdminCancelBookingInput
) {
  await ensureAdminContext(context);
  const parsed = adminCancelBookingInputSchema.parse(input);

  const [sessionData] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const sessionRate = Number(sessionData.rate) || 0;
  const resolved = resolveAdminCancellation({
    status: sessionData.status,
    rate: sessionRate,
    refundPercentage: parsed.refundPercentage,
    reason: parsed.reason,
  });

  await db
    .update(sessions)
    .set(resolved.update)
    .where(eq(sessions.id, parsed.bookingId));

  await logAdminSessionAction({
    adminId: context.userId,
    sessionId: parsed.bookingId,
    action: ADMIN_SESSION_ACTIONS.FORCE_CANCEL,
    previousStatus: resolved.previousStatus,
    newStatus: resolved.update.status,
    reason: parsed.reason,
    details: {
      refundPercentage: parsed.refundPercentage,
      refundAmount: resolved.refundAmount,
      notificationsSent: parsed.notifyParties,
    },
    ipAddress: getRequestIp(context),
    userAgent: getRequestUserAgent(context),
  });

  return {
    sessionId: parsed.bookingId,
    previousStatus: resolved.previousStatus,
    newStatus: resolved.update.status,
    refundAmount: resolved.refundAmount,
    refundPercentage: parsed.refundPercentage,
    message: 'Session cancelled successfully',
  };
}

export async function adminCompleteBooking(
  context: AuthenticatedContext,
  input: AdminCompleteBookingInput
) {
  await ensureAdminContext(context);
  const parsed = adminCompleteBookingInputSchema.parse(input);

  const [sessionData] = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      duration: sessions.duration,
    })
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const resolved = resolveAdminCompletion({
    status: sessionData.status,
    originalDuration: sessionData.duration,
    actualDuration: parsed.actualDuration,
  });

  await db
    .update(sessions)
    .set(resolved.update)
    .where(eq(sessions.id, parsed.bookingId));

  await logAdminSessionAction({
    adminId: context.userId,
    sessionId: parsed.bookingId,
    action: ADMIN_SESSION_ACTIONS.FORCE_COMPLETE,
    previousStatus: resolved.previousStatus,
    newStatus: resolved.update.status,
    reason: parsed.reason,
    details: {
      originalDuration: sessionData.duration,
      actualDuration: resolved.duration,
    },
    ipAddress: getRequestIp(context),
    userAgent: getRequestUserAgent(context),
  });

  return {
    sessionId: parsed.bookingId,
    previousStatus: resolved.previousStatus,
    newStatus: resolved.update.status,
    duration: resolved.duration,
    message: 'Session marked as completed',
  };
}

export async function adminRefundBooking(
  context: AuthenticatedContext,
  input: AdminRefundBookingInput
) {
  await ensureAdminContext(context);
  const parsed = adminRefundBookingInputSchema.parse(input);

  const [sessionData] = await db
    .select({
      id: sessions.id,
      rate: sessions.rate,
      refundAmount: sessions.refundAmount,
    })
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const originalRate = Number(sessionData.rate) || 0;
  const previousRefundAmount = Number(sessionData.refundAmount) || 0;
  const resolved = resolveAdminRefund({
    originalRate,
    previousRefundAmount,
    amount: parsed.amount,
    refundType: parsed.refundType,
  });

  await db
    .update(sessions)
    .set(resolved.update)
    .where(eq(sessions.id, parsed.bookingId));

  await logAdminSessionAction({
    adminId: context.userId,
    sessionId: parsed.bookingId,
    action: ADMIN_SESSION_ACTIONS.MANUAL_REFUND,
    reason: parsed.reason,
    details: {
      refundAmount: parsed.amount,
      refundType: parsed.refundType,
      originalRate,
      previousRefundAmount,
      newTotalRefund: resolved.newRefundAmount,
    },
    ipAddress: getRequestIp(context),
    userAgent: getRequestUserAgent(context),
  });

  return {
    sessionId: parsed.bookingId,
    refundAmount: resolved.newRefundAmount,
    refundPercentage: resolved.refundPercentage,
    refundType: parsed.refundType,
    message: 'Refund issued successfully',
  };
}

export async function adminClearNoShow(
  context: AuthenticatedContext,
  input: AdminClearNoShowInput
) {
  await ensureAdminContext(context);
  const parsed = adminClearNoShowInputSchema.parse(input);

  const [sessionData] = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      noShowMarkedBy: sessions.noShowMarkedBy,
      noShowMarkedAt: sessions.noShowMarkedAt,
    })
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const resolved = resolveAdminClearNoShow({
    status: sessionData.status,
    restoreStatus: parsed.restoreStatus,
  });

  await db
    .update(sessions)
    .set(resolved.update)
    .where(eq(sessions.id, parsed.bookingId));

  await logAdminSessionAction({
    adminId: context.userId,
    sessionId: parsed.bookingId,
    action: ADMIN_SESSION_ACTIONS.CLEAR_NO_SHOW,
    previousStatus: resolved.previousStatus,
    newStatus: parsed.restoreStatus,
    reason: parsed.reason,
    details: {
      originalNoShowMarkedBy: sessionData.noShowMarkedBy,
      originalNoShowMarkedAt: serializeDate(sessionData.noShowMarkedAt),
    },
    ipAddress: getRequestIp(context),
    userAgent: getRequestUserAgent(context),
  });

  return {
    sessionId: parsed.bookingId,
    previousStatus: resolved.previousStatus,
    newStatus: parsed.restoreStatus,
    message: 'No-show flag cleared successfully',
  };
}

export async function adminReassignBooking(
  context: AuthenticatedContext,
  input: AdminReassignBookingInput
) {
  await ensureAdminContext(context);
  const parsed = adminReassignBookingInputSchema.parse(input);

  const [sessionData] = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      mentorId: sessions.mentorId,
    })
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');
  assertAdminCanReassign({
    status: sessionData.status,
    currentMentorId: sessionData.mentorId,
    newMentorId: parsed.newMentorId,
  });

  const [newMentor] = await db
    .select({
      userId: mentors.userId,
      verificationStatus: mentors.verificationStatus,
    })
    .from(mentors)
    .where(eq(mentors.userId, parsed.newMentorId))
    .limit(1);

  assertBooking(newMentor, 404, 'New mentor not found');
  assertBooking(
    newMentor.verificationStatus === 'VERIFIED',
    400,
    'New mentor is not verified'
  );

  const [previousMentor, newMentorUser] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, sessionData.mentorId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, parsed.newMentorId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  await db
    .update(sessions)
    .set({
      mentorId: parsed.newMentorId,
      wasReassigned: true,
      reassignedFromMentorId: sessionData.mentorId,
      reassignedAt: new Date(),
      reassignmentStatus: 'accepted',
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, parsed.bookingId));

  await logAdminSessionAction({
    adminId: context.userId,
    sessionId: parsed.bookingId,
    action: ADMIN_SESSION_ACTIONS.REASSIGN_SESSION,
    reason: parsed.reason,
    details: {
      previousMentorId: sessionData.mentorId,
      previousMentorName: previousMentor?.name,
      newMentorId: parsed.newMentorId,
      newMentorName: newMentorUser?.name,
      notificationsSent: parsed.notifyParties,
    },
    ipAddress: getRequestIp(context),
    userAgent: getRequestUserAgent(context),
  });

  return {
    sessionId: parsed.bookingId,
    previousMentor: previousMentor?.name ?? null,
    newMentor: newMentorUser?.name ?? null,
    message: 'Session reassigned successfully',
  };
}

export async function listAdminBookingNotes(
  context: AuthenticatedContext,
  input: AdminListBookingNotesInput
) {
  await ensureAdminContext(context);
  const parsed = adminListBookingNotesInputSchema.parse(input);

  const [sessionData] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const noteAdminUser = alias(users, 'admin_session_note_list_user');
  const notes = await db
    .select({
      id: adminSessionNotes.id,
      note: adminSessionNotes.note,
      adminId: adminSessionNotes.adminId,
      adminName: noteAdminUser.name,
      createdAt: adminSessionNotes.createdAt,
      updatedAt: adminSessionNotes.updatedAt,
    })
    .from(adminSessionNotes)
    .leftJoin(noteAdminUser, eq(adminSessionNotes.adminId, noteAdminUser.id))
    .where(eq(adminSessionNotes.sessionId, parsed.bookingId))
    .orderBy(desc(adminSessionNotes.createdAt));

  return notes.map((note) => ({
    id: note.id,
    note: note.note,
    adminId: note.adminId,
    adminName: note.adminName,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));
}

export async function addAdminBookingNote(
  context: AuthenticatedContext,
  input: AdminAddBookingNoteInput
) {
  await ensureAdminContext(context);
  const parsed = adminAddBookingNoteInputSchema.parse(input);

  const [sessionData] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, parsed.bookingId))
    .limit(1);

  assertBooking(sessionData, 404, 'Session not found');

  const [newNote] = await db
    .insert(adminSessionNotes)
    .values({
      sessionId: parsed.bookingId,
      adminId: context.userId,
      note: parsed.note,
    })
    .returning();

  await logAdminSessionAction({
    adminId: context.userId,
    sessionId: parsed.bookingId,
    action: ADMIN_SESSION_ACTIONS.NOTE_ADDED,
    details: {
      noteId: newNote.id,
      notePreview: parsed.note.substring(0, 100),
    },
    ipAddress: getRequestIp(context),
    userAgent: getRequestUserAgent(context),
  });

  return {
    id: newNote.id,
    note: newNote.note,
    createdAt: newNote.createdAt.toISOString(),
    message: 'Note added successfully',
  };
}
