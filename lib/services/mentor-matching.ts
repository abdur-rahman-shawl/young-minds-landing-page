import { db } from '@/lib/db';
import {
    mentors,
    mentorAvailabilitySchedules,
    mentorWeeklyPatterns,
    mentorAvailabilityExceptions,
    sessions
} from '@/lib/db/schema';
import { eq, and, ne, lte, gte, inArray, notInArray } from 'drizzle-orm';
import { getDay, addMinutes, isSameDay } from 'date-fns';

/**
 * Finds an available replacement mentor for a specific time slot.
 * Used for auto-reassignment when a mentor cancels a session.
 * 
 * Checks:
 * 1. Mentor is active, verified, and has active schedule
 * 2. Mentor's weekly pattern allows the day/time
 * 3. No blocking exceptions for the date
 * 4. No conflicting bookings (with buffer time)
 * 
 * @param scheduledAt - Date object for the session start time
 * @param duration - Duration in minutes
 * @param excludeMentorId - The ID of the mentor to exclude (the one cancelling)
 * @returns The ID of an available replacement mentor, or null if none found
 */
export async function findAvailableReplacementMentor(
    scheduledAt: Date,
    duration: number,
    excludeMentorId: string
): Promise<string | null> {
    try {
        const dayOfWeek = getDay(scheduledAt);
        const sessionEndTime = addMinutes(scheduledAt, duration);
        const bookingTimeStr = `${scheduledAt.getHours().toString().padStart(2, '0')}:${scheduledAt.getMinutes().toString().padStart(2, '0')}`;
        const sessionEndStr = `${sessionEndTime.getHours().toString().padStart(2, '0')}:${sessionEndTime.getMinutes().toString().padStart(2, '0')}`;

        // 1. Get all potential mentors (active, verified, available, and active schedule)
        // We fetch a batch first to filter in memory/logic as complex SQL might be overkill or buggy to write in one go
        const potentialMentors = await db
            .select({
                mentorId: mentors.userId,
                scheduleId: mentorAvailabilitySchedules.id,
                bufferTime: mentorAvailabilitySchedules.bufferTimeBetweenSessions,
            })
            .from(mentors)
            .innerJoin(mentorAvailabilitySchedules, eq(mentors.id, mentorAvailabilitySchedules.mentorId))
            .where(
                and(
                    ne(mentors.userId, excludeMentorId), // Exclude the cancelling mentor
                    eq(mentors.isAvailable, true),
                    eq(mentors.verificationStatus, 'VERIFIED'),
                    eq(mentorAvailabilitySchedules.isActive, true)
                )
            );

        if (potentialMentors.length === 0) {
            return null;
        }

        const validMentorIds: string[] = [];

        // 2. Check each mentor's availability
        // This could be optimized into a more complex query, but checking programmatically is safer for correctness first
        for (const mentor of potentialMentors) {
            // A. Check Weekly Pattern
            const weeklyPattern = await db
                .select()
                .from(mentorWeeklyPatterns)
                .where(
                    and(
                        eq(mentorWeeklyPatterns.scheduleId, mentor.scheduleId),
                        eq(mentorWeeklyPatterns.dayOfWeek, dayOfWeek),
                        eq(mentorWeeklyPatterns.isEnabled, true)
                    )
                )
                .limit(1);

            if (!weeklyPattern.length) continue;

            const timeBlocks = weeklyPattern[0].timeBlocks as any[];
            let isTimeSlotAvailable = false;

            // Check if time matches an AVAILABLE block
            for (const block of timeBlocks) {
                if (block.type === 'AVAILABLE') {
                    if (bookingTimeStr >= block.startTime && sessionEndStr <= block.endTime) {
                        isTimeSlotAvailable = true;
                        break;
                    }
                }
            }

            if (!isTimeSlotAvailable) continue;

            // B. Check Exceptions
            const exceptions = await db
                .select()
                .from(mentorAvailabilityExceptions)
                .where(
                    and(
                        eq(mentorAvailabilityExceptions.scheduleId, mentor.scheduleId),
                        lte(mentorAvailabilityExceptions.startDate, scheduledAt),
                        gte(mentorAvailabilityExceptions.endDate, scheduledAt)
                    )
                );

            let isBlockedByException = false;
            for (const exception of exceptions) {
                if (exception.type !== 'AVAILABLE') { // Assuming anything not explicitly AVAILABLE in exceptions is potentially blocking if it overlaps
                    // For simplicity, treating any exception in this range as a block if it's not strictly 'AVAILABLE' type overriding something
                    // But mostly exceptions are 'BLOCKED' or 'BREAK'.
                    // If 'isFullDay', it's definitely blocked.
                    if (exception.isFullDay) {
                        isBlockedByException = true;
                        break;
                    }
                    // If partial day, we'd need to check times, but for now safe to assume if an exception exists it might be risky.
                    // Let's check strictly if it's a BLOCK type.
                    if (exception.type === 'BLOCKED' || exception.type === 'BREAK') {
                        // If full day or no time blocks, assume full block
                        if (exception.isFullDay || !exception.timeBlocks) {
                            isBlockedByException = true;
                        } else {
                            // Check overlap with exception blocks
                            // (Simplified: if exception overlaps session)
                            // TODO: implement detailed exception block check if needed. 
                            // For MVP, blocking the whole day if an exception covers the start time is a safe conservative heuristic.
                            isBlockedByException = true;
                        }
                    }
                }
            }

            if (isBlockedByException) continue;

            // C. Check Conflicting Bookings
            // We need to check if this mentor has any other "scheduled" or "in_progress" sessions that overlap
            // including their buffer time.
            const bufferMinutes = mentor.bufferTime || 0;
            // Range to check: SessionStart - Buffer <-> SessionEnd + Buffer
            // We check if any existing booking overlaps with [NewSessionStart, NewSessionEnd]
            // Actually, we check if ExistingBooking (with its own buffer) overlaps with NewSession

            const conflicts = await db
                .select()
                .from(sessions)
                .where(
                    and(
                        eq(sessions.mentorId, mentor.mentorId),
                        inArray(sessions.status, ['scheduled', 'in_progress'])
                        // We can't easily do complex time overlap in SQL without raw queries or specific dialect functions
                        // So we'll fetch entries around the day and filter in JS
                    )
                );

            let hasConflict = false;
            for (const session of conflicts) {
                // Simple overlap check
                // Existing session time range
                const existingStart = new Date(session.scheduledAt);
                const existingEnd = addMinutes(existingStart, session.duration);

                // Apply buffer to existing session (effectively determining blocked usage range)
                const blockedStart = addMinutes(existingStart, -bufferMinutes);
                const blockedEnd = addMinutes(existingEnd, bufferMinutes);

                // Check overlap: StartA < EndB && EndA > StartB
                if (scheduledAt < blockedEnd && sessionEndTime > blockedStart) {
                    hasConflict = true;
                    break;
                }
            }

            if (hasConflict) continue;

            // If we passed all checks, this mentor is a candidate
            validMentorIds.push(mentor.mentorId);
        }

        if (validMentorIds.length === 0) {
            return null;
        }

        // Pick a random mentor
        const randomIndex = Math.floor(Math.random() * validMentorIds.length);
        return validMentorIds[randomIndex];

    } catch (error) {
        console.error('Error finding random mentor:', error);
        return null; // Fail safe
    }
}
