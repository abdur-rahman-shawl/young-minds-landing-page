import {
  and,
  eq,
  gte,
  lte,
  or,
} from 'drizzle-orm';
import {
  addDays,
  addHours,
  addMinutes,
  getDay,
} from 'date-fns';

import {
  AccessPolicyError,
  assertMenteeFeatureAccess as assertSharedMenteeFeatureAccess,
  assertMentorFeatureAccess as assertSharedMentorFeatureAccess,
} from '@/lib/access-policy/server';
import { db } from '@/lib/db';
import {
  mentorAvailabilityExceptions,
  mentorAvailabilityRules,
  mentorAvailabilitySchedules,
  mentorWeeklyPatterns,
  mentors,
  sessions,
} from '@/lib/db/schema';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import {
  canManageMentorAvailability,
} from '@/lib/mentor/availability-access';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';
import {
  hasBlockingAvailabilityException,
  isBlockingAvailabilityExceptionType,
} from '@/lib/mentor/availability-rules';
import {
  enforceFeature,
  isSubscriptionPolicyError,
} from '@/lib/subscriptions/policy-runtime';
import {
  applyBlockedTimes,
  validateTimeBlock,
  validateWeeklySchedule,
} from '@/lib/utils/availability-validation';
import { assertMentorLifecycle } from './errors';
import {
  deleteMentorAvailabilityExceptionsInputSchema,
  mentorAvailabilityExceptionInputSchema,
  mentorAvailabilityInputSchema,
  mentorAvailabilityQueryInputSchema,
  mentorBookingEligibilityInputSchema,
  mentorSlotsInputSchema,
  type DeleteMentorAvailabilityExceptionsInput,
  type MentorAvailabilityExceptionInput,
  type MentorAvailabilityInput,
  type MentorAvailabilityQueryInput,
  type MentorBookingEligibilityInput,
  type MentorSlotsInput,
} from './schemas';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

type TimeBlock = {
  startTime: string;
  endTime: string;
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
};

type AvailableSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
};

const MENTOR_PROFILE_REQUIRED_ERROR =
  'Complete your mentor profile before managing availability.';

async function getAvailabilityUser(
  userId: string,
  currentUser?: CurrentUser
): Promise<CurrentUser> {
  const resolvedUser = currentUser ?? (await getUserWithRoles(userId));
  assertMentorLifecycle(resolvedUser, 401, 'Authentication required');
  return resolvedUser;
}

function isAdmin(user: CurrentUser) {
  return user.roles.some(
    (role: { name: string }) => role.name === 'admin'
  );
}

async function assertBrowseAccess(
  userId: string,
  currentUser?: CurrentUser
) {
  try {
    await assertSharedMenteeFeatureAccess({
      userId,
      feature: MENTEE_FEATURE_KEYS.mentorDirectoryView,
      currentUser,
      source: `mentor.availability.${MENTEE_FEATURE_KEYS.mentorDirectoryView}`,
    });
  } catch (error) {
    if (error instanceof AccessPolicyError) {
      assertMentorLifecycle(false, error.status, error.message, error.data);
    }

    throw error;
  }
}

async function getMentorRecordByUserId(mentorUserId: string) {
  const [mentor] = await db
    .select()
    .from(mentors)
    .where(eq(mentors.userId, mentorUserId))
    .limit(1);

  return mentor ?? null;
}

async function getScheduleByMentorUserId(mentorUserId: string) {
  const mentor = await getMentorRecordByUserId(mentorUserId);
  if (!mentor) {
    return {
      mentor: null,
      schedule: null,
    };
  }

  const [schedule] = await db
    .select()
    .from(mentorAvailabilitySchedules)
    .where(eq(mentorAvailabilitySchedules.mentorId, mentor.id))
    .limit(1);

  return {
    mentor,
    schedule: schedule ?? null,
  };
}

function assertAvailabilityManagerAccess(
  actor: CurrentUser,
  targetMentorUserId: string
) {
  assertMentorLifecycle(
    canManageMentorAvailability({
      isAdmin: isAdmin(actor),
      actorUserId: actor.id,
      targetMentorUserId,
    }),
    403,
    'Forbidden'
  );
}

async function assertAvailabilityFeatureAccess(
  userId: string,
  currentUser?: CurrentUser
) {
  try {
    await assertSharedMentorFeatureAccess({
      userId,
      feature: MENTOR_FEATURE_KEYS.availabilityManage,
      currentUser,
      source: 'mentor.availability.manage',
    });
  } catch (error) {
    if (error instanceof AccessPolicyError) {
      assertMentorLifecycle(false, error.status, error.message, error.data);
    }

    throw error;
  }
}

export async function getMentorAvailability(
  userId: string,
  input: MentorAvailabilityQueryInput,
  currentUser?: CurrentUser
) {
  const actor = await getAvailabilityUser(userId, currentUser);
  const parsed = mentorAvailabilityQueryInputSchema.parse(input);

  assertAvailabilityManagerAccess(actor, parsed.mentorUserId);
  await assertAvailabilityFeatureAccess(parsed.mentorUserId, actor);

  const { mentor, schedule } = await getScheduleByMentorUserId(parsed.mentorUserId);

  assertMentorLifecycle(mentor, 409, MENTOR_PROFILE_REQUIRED_ERROR);

  if (!schedule) {
    return {
      success: true,
      schedule: null,
      weeklyPatterns: [],
      exceptions: [],
      rules: [],
      message: 'No availability schedule found. Please set up your availability.',
    };
  }

  const exceptionFilters = [eq(mentorAvailabilityExceptions.scheduleId, schedule.id)];

  if (parsed.startDate && parsed.endDate) {
    exceptionFilters.push(
      gte(mentorAvailabilityExceptions.startDate, new Date(parsed.startDate)),
      lte(mentorAvailabilityExceptions.endDate, new Date(parsed.endDate))
    );
  }

  const [weeklyPatterns, exceptions, rules] = await Promise.all([
    db
      .select()
      .from(mentorWeeklyPatterns)
      .where(eq(mentorWeeklyPatterns.scheduleId, schedule.id)),
    db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(and(...exceptionFilters)),
    db
      .select()
      .from(mentorAvailabilityRules)
      .where(
        and(
          eq(mentorAvailabilityRules.scheduleId, schedule.id),
          eq(mentorAvailabilityRules.isActive, true)
        )
      ),
  ]);

  return {
    success: true,
    schedule,
    weeklyPatterns,
    exceptions,
    rules,
  };
}

function assertValidAvailabilitySchedule(input: MentorAvailabilityInput) {
  for (const pattern of input.weeklyPatterns) {
    if (!pattern.isEnabled || pattern.timeBlocks.length === 0) {
      continue;
    }

    for (const block of pattern.timeBlocks) {
      const validation = validateTimeBlock(
        block,
        pattern.timeBlocks.filter((candidate) => candidate !== block)
      );

      assertMentorLifecycle(
        validation.isValid,
        400,
        'Time blocks validation failed: Overlapping time periods detected'
      );
    }
  }

  const weeklyValidation = validateWeeklySchedule(input.weeklyPatterns);
  assertMentorLifecycle(
    weeklyValidation.isValid,
    400,
    'Schedule contains time conflicts',
    weeklyValidation.errors
  );
}

export async function upsertMentorAvailability(
  userId: string,
  mentorUserId: string,
  input: MentorAvailabilityInput,
  currentUser?: CurrentUser
) {
  const actor = await getAvailabilityUser(userId, currentUser);
  assertAvailabilityManagerAccess(actor, mentorUserId);
  await assertAvailabilityFeatureAccess(mentorUserId, actor);

  const mentor = await getMentorRecordByUserId(mentorUserId);
  assertMentorLifecycle(mentor, 409, MENTOR_PROFILE_REQUIRED_ERROR);

  const parsed = mentorAvailabilityInputSchema.parse(input);
  assertValidAvailabilitySchedule(parsed);

  const result = await db.transaction(async (tx) => {
    const [existingSchedule] = await tx
      .select()
      .from(mentorAvailabilitySchedules)
      .where(eq(mentorAvailabilitySchedules.mentorId, mentor.id))
      .limit(1);

    let scheduleId = existingSchedule?.id ?? null;

    if (existingSchedule) {
      await tx
        .update(mentorAvailabilitySchedules)
        .set({
          timezone: parsed.timezone,
          defaultSessionDuration: parsed.defaultSessionDuration,
          bufferTimeBetweenSessions: parsed.bufferTimeBetweenSessions,
          minAdvanceBookingHours: parsed.minAdvanceBookingHours,
          maxAdvanceBookingDays: parsed.maxAdvanceBookingDays,
          defaultStartTime: parsed.defaultStartTime,
          defaultEndTime: parsed.defaultEndTime,
          isActive: parsed.isActive,
          allowInstantBooking: parsed.allowInstantBooking,
          requireConfirmation: parsed.requireConfirmation,
          updatedAt: new Date(),
        })
        .where(eq(mentorAvailabilitySchedules.id, existingSchedule.id));

      await tx
        .delete(mentorWeeklyPatterns)
        .where(eq(mentorWeeklyPatterns.scheduleId, existingSchedule.id));
    } else {
      const [createdSchedule] = await tx
        .insert(mentorAvailabilitySchedules)
        .values({
          mentorId: mentor.id,
          timezone: parsed.timezone,
          defaultSessionDuration: parsed.defaultSessionDuration,
          bufferTimeBetweenSessions: parsed.bufferTimeBetweenSessions,
          minAdvanceBookingHours: parsed.minAdvanceBookingHours,
          maxAdvanceBookingDays: parsed.maxAdvanceBookingDays,
          defaultStartTime: parsed.defaultStartTime,
          defaultEndTime: parsed.defaultEndTime,
          isActive: parsed.isActive,
          allowInstantBooking: parsed.allowInstantBooking,
          requireConfirmation: parsed.requireConfirmation,
        })
        .returning();

      scheduleId = createdSchedule.id;
    }

    if (parsed.weeklyPatterns.length > 0 && scheduleId) {
      await tx.insert(mentorWeeklyPatterns).values(
        parsed.weeklyPatterns.map((pattern) => ({
          scheduleId,
          dayOfWeek: pattern.dayOfWeek,
          isEnabled: pattern.isEnabled,
          timeBlocks: pattern.timeBlocks,
        }))
      );
    }

    return {
      success: true,
      message: existingSchedule
        ? 'Availability updated successfully'
        : 'Availability schedule created successfully',
    };
  });

  return result;
}

export async function listMentorAvailabilityExceptions(
  userId: string,
  input: MentorAvailabilityQueryInput,
  currentUser?: CurrentUser
) {
  const actor = await getAvailabilityUser(userId, currentUser);
  const parsed = mentorAvailabilityQueryInputSchema.parse(input);

  assertAvailabilityManagerAccess(actor, parsed.mentorUserId);
  await assertAvailabilityFeatureAccess(parsed.mentorUserId, actor);

  const { mentor, schedule } = await getScheduleByMentorUserId(parsed.mentorUserId);
  assertMentorLifecycle(mentor, 409, MENTOR_PROFILE_REQUIRED_ERROR);

  if (!schedule) {
    return {
      success: true,
      exceptions: [],
      message: 'No availability schedule found',
    };
  }

  const filters = [eq(mentorAvailabilityExceptions.scheduleId, schedule.id)];

  if (parsed.startDate && parsed.endDate) {
    filters.push(
      gte(mentorAvailabilityExceptions.startDate, new Date(parsed.startDate)),
      lte(mentorAvailabilityExceptions.endDate, new Date(parsed.endDate))
    );
  }

  const exceptions = await db
    .select()
    .from(mentorAvailabilityExceptions)
    .where(and(...filters));

  return {
    success: true,
    exceptions,
  };
}

export async function createMentorAvailabilityException(
  userId: string,
  input: MentorAvailabilityExceptionInput,
  currentUser?: CurrentUser
) {
  const actor = await getAvailabilityUser(userId, currentUser);
  const parsed = mentorAvailabilityExceptionInputSchema.parse(input);

  assertAvailabilityManagerAccess(actor, parsed.mentorUserId);
  await assertAvailabilityFeatureAccess(parsed.mentorUserId, actor);

  const { mentor, schedule } = await getScheduleByMentorUserId(parsed.mentorUserId);
  assertMentorLifecycle(mentor, 409, MENTOR_PROFILE_REQUIRED_ERROR);
  assertMentorLifecycle(
    schedule,
    404,
    'No availability schedule found. Please set up your availability first.'
  );

  const startDate = new Date(parsed.startDate);
  const endDate = new Date(parsed.endDate);

  assertMentorLifecycle(
    startDate <= endDate,
    400,
    'Start date must be before or equal to end date'
  );

  const overlappingExceptions = await db
    .select()
    .from(mentorAvailabilityExceptions)
    .where(
      and(
        eq(mentorAvailabilityExceptions.scheduleId, schedule.id),
        lte(mentorAvailabilityExceptions.startDate, endDate),
        gte(mentorAvailabilityExceptions.endDate, startDate)
      )
    );

  assertMentorLifecycle(
    overlappingExceptions.length === 0,
    409,
    'This exception overlaps with an existing exception'
  );

  const [exception] = await db
    .insert(mentorAvailabilityExceptions)
    .values({
      scheduleId: schedule.id,
      startDate,
      endDate,
      type: parsed.type,
      reason: parsed.reason,
      isFullDay: parsed.isFullDay,
      timeBlocks: parsed.timeBlocks,
    })
    .returning();

  return {
    success: true,
    exception,
    message: 'Availability exception created successfully',
  };
}

export async function deleteMentorAvailabilityExceptions(
  userId: string,
  input: DeleteMentorAvailabilityExceptionsInput,
  currentUser?: CurrentUser
) {
  const actor = await getAvailabilityUser(userId, currentUser);
  const parsed = deleteMentorAvailabilityExceptionsInputSchema.parse(input);

  assertAvailabilityManagerAccess(actor, parsed.mentorUserId);
  await assertAvailabilityFeatureAccess(parsed.mentorUserId, actor);

  const { mentor, schedule } = await getScheduleByMentorUserId(parsed.mentorUserId);
  assertMentorLifecycle(mentor, 409, MENTOR_PROFILE_REQUIRED_ERROR);
  assertMentorLifecycle(schedule, 404, 'No availability schedule found');

  const deletedCount = await db.transaction(async (tx) => {
    let count = 0;

    for (const exceptionId of parsed.exceptionIds) {
      const result = await tx
        .delete(mentorAvailabilityExceptions)
        .where(
          and(
            eq(mentorAvailabilityExceptions.id, exceptionId),
            eq(mentorAvailabilityExceptions.scheduleId, schedule.id)
          )
        );

      if (result) {
        count += 1;
      }
    }

    return count;
  });

  return {
    success: true,
    deletedCount,
    message: `${deletedCount} exception(s) deleted successfully`,
  };
}

export async function listMentorAvailableSlots(
  userId: string,
  input: MentorSlotsInput,
  currentUser?: CurrentUser
) {
  const actor = await getAvailabilityUser(userId, currentUser);
  await assertBrowseAccess(userId, actor);

  const parsed = mentorSlotsInputSchema.parse(input);
  const { mentor, schedule } = await getScheduleByMentorUserId(parsed.mentorUserId);

  assertMentorLifecycle(mentor, 404, 'Mentor not found');

  if (!schedule || !schedule.isActive) {
    return {
      success: true,
      slots: [],
      mentorTimezone: schedule?.timezone ?? 'UTC',
      message:
        'Mentor has not set up availability or is currently unavailable',
    };
  }

  const [weeklyPatterns, exceptions, existingBookings] = await Promise.all([
    db
      .select()
      .from(mentorWeeklyPatterns)
      .where(eq(mentorWeeklyPatterns.scheduleId, schedule.id)),
    db
      .select()
      .from(mentorAvailabilityExceptions)
      .where(
        and(
          eq(mentorAvailabilityExceptions.scheduleId, schedule.id),
          lte(mentorAvailabilityExceptions.startDate, new Date(parsed.endDate)),
          gte(mentorAvailabilityExceptions.endDate, new Date(parsed.startDate))
        )
      ),
    db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.mentorId, parsed.mentorUserId),
          gte(sessions.scheduledAt, new Date(parsed.startDate)),
          lte(sessions.scheduledAt, new Date(parsed.endDate)),
          or(eq(sessions.status, 'scheduled'), eq(sessions.status, 'in_progress'))
        )
      ),
  ]);

  const slots: AvailableSlot[] = [];
  const requestDuration = parsed.duration || schedule.defaultSessionDuration;
  const bufferTime = schedule.bufferTimeBetweenSessions;
  const minAdvanceHours = schedule.minAdvanceBookingHours;
  const maxAdvanceDays = schedule.maxAdvanceBookingDays;

  const now = new Date();
  const minBookingTime = addHours(now, minAdvanceHours);
  const maxBookingTime = addDays(now, maxAdvanceDays);

  const currentDate = new Date(parsed.startDate);
  const endDateValue = new Date(parsed.endDate);

  while (currentDate <= endDateValue) {
    const dayOfWeek = getDay(currentDate);
    const dayPattern = weeklyPatterns.find(
      (pattern) => pattern.dayOfWeek === dayOfWeek
    );

    if (dayPattern && dayPattern.isEnabled) {
      const timeBlocks = dayPattern.timeBlocks as TimeBlock[];
      const availableBlocks = timeBlocks.filter((block) => block.type === 'AVAILABLE');
      const blockedBlocks = timeBlocks.filter((block) => block.type !== 'AVAILABLE');
      const effectiveBlocks = applyBlockedTimes(availableBlocks, blockedBlocks);

      for (const block of effectiveBlocks) {
        if (block.type !== 'AVAILABLE') {
          continue;
        }

        const [startHour, startMinute] = block.startTime.split(':').map(Number);
        const [endHour, endMinute] = block.endTime.split(':').map(Number);

        const blockStart = new Date(currentDate);
        blockStart.setHours(startHour, startMinute, 0, 0);

        const blockEnd = new Date(currentDate);
        blockEnd.setHours(endHour, endMinute, 0, 0);

        let slotStart = new Date(blockStart);

        while (addMinutes(slotStart, requestDuration) <= blockEnd) {
          const slotEnd = addMinutes(slotStart, requestDuration);

          if (slotStart < minBookingTime || slotStart > maxBookingTime) {
            slotStart = addMinutes(slotStart, 30);
            continue;
          }

          let blockingReason: string | undefined;

          for (const exception of exceptions) {
            if (
              exception.isFullDay &&
              hasBlockingAvailabilityException([exception], slotStart)
            ) {
              blockingReason = exception.reason || 'Unavailable';
              break;
            }

            if (!exception.isFullDay && exception.timeBlocks) {
              const exceptionBlocks = exception.timeBlocks as TimeBlock[];
              for (const exceptionBlock of exceptionBlocks) {
                if (!isBlockingAvailabilityExceptionType(exceptionBlock.type)) {
                  continue;
                }

                const [exStartHour, exStartMinute] = exceptionBlock.startTime
                  .split(':')
                  .map(Number);
                const [exEndHour, exEndMinute] = exceptionBlock.endTime
                  .split(':')
                  .map(Number);

                const exceptionStart = new Date(slotStart);
                exceptionStart.setHours(exStartHour, exStartMinute, 0, 0);

                const exceptionEnd = new Date(slotStart);
                exceptionEnd.setHours(exEndHour, exEndMinute, 0, 0);

                const overlapsException =
                  (slotStart >= exceptionStart && slotStart < exceptionEnd) ||
                  (slotEnd > exceptionStart && slotEnd <= exceptionEnd) ||
                  (slotStart <= exceptionStart && slotEnd >= exceptionEnd);

                if (overlapsException) {
                  blockingReason = exception.reason || 'Unavailable';
                  break;
                }
              }
            }

            if (blockingReason) {
              break;
            }
          }

          if (blockingReason) {
            slots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              available: false,
              reason: blockingReason,
            });
            slotStart = addMinutes(slotStart, 30);
            continue;
          }

          const isBooked = existingBookings.some((booking) => {
            const bookingStart = new Date(booking.scheduledAt);
            const bookingEnd = addMinutes(
              bookingStart,
              booking.duration ?? requestDuration
            );
            const bufferedBookingStart = addMinutes(bookingStart, -bufferTime);
            const bufferedBookingEnd = addMinutes(bookingEnd, bufferTime);

            return (
              (slotStart >= bufferedBookingStart &&
                slotStart < bufferedBookingEnd) ||
              (slotEnd > bufferedBookingStart && slotEnd <= bufferedBookingEnd) ||
              (slotStart <= bufferedBookingStart && slotEnd >= bufferedBookingEnd)
            );
          });

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            available: !isBooked,
            reason: isBooked ? 'Already booked' : undefined,
          });

          slotStart = addMinutes(slotStart, 30);
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return {
    success: true,
    slots,
    mentorTimezone: parsed.timezone || schedule.timezone,
  };
}

export async function getMentorBookingEligibility(
  input: MentorBookingEligibilityInput
) {
  const parsed = mentorBookingEligibilityInputSchema.parse(input);

  const [freeAccess, paidAccess] = await Promise.all([
    enforceFeature({
      action: 'mentor.free_session_availability',
      userId: parsed.mentorUserId,
    }).catch((error) => {
      if (isSubscriptionPolicyError(error)) {
        return null;
      }

      throw error;
    }),
    enforceFeature({
      action: 'mentor.paid_session_availability',
      userId: parsed.mentorUserId,
    }).catch((error) => {
      if (isSubscriptionPolicyError(error)) {
        return null;
      }

      throw error;
    }),
  ]);

  return {
    success: true,
    data: {
      free_available: Boolean(freeAccess?.has_access),
      free_remaining: freeAccess?.remaining ?? null,
      paid_available: Boolean(paidAccess?.has_access),
      paid_remaining: paidAccess?.remaining ?? null,
    },
  };
}
