import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, mentors, users } from '@/lib/db/schema';
import { eq, and, ne, inArray, notInArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import { addMinutes, getDay } from 'date-fns';
import {
    mentorAvailabilitySchedules,
    mentorWeeklyPatterns,
    mentorAvailabilityExceptions
} from '@/lib/db/schema';

/**
 * GET /api/bookings/[id]/alternative-mentors
 * 
 * Fetches available mentors for a session that needs reassignment.
 * 
 * Query params:
 * - fixedTime: "true" = only mentors available at exact session time (Scenario A)
 *              "false" = all available mentors with their slots (Scenario B)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: sessionId } = await params;
        const { searchParams } = new URL(request.url);
        const fixedTime = searchParams.get('fixedTime') === 'true';

        // Get the session
        const [booking] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!booking) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Verify user is the mentee
        if (booking.menteeId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get cancelled mentor IDs (to exclude from results)
        const cancelledMentorIds = (booking.cancelledMentorIds as string[]) || [];

        // Build the list of mentors
        const availableMentors = await findAvailableMentorsForSession(
            booking.scheduledAt,
            booking.duration || 60,
            cancelledMentorIds,
            fixedTime
        );

        return NextResponse.json({
            mentors: availableMentors,
            originalScheduledAt: booking.scheduledAt.toISOString(),
            originalDuration: booking.duration || 60,
            sessionTitle: booking.title,
            fixedTime
        });

    } catch (error) {
        console.error('Error fetching alternative mentors:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alternative mentors' },
            { status: 500 }
        );
    }
}

/**
 * Find mentors available for a session
 */
async function findAvailableMentorsForSession(
    scheduledAt: Date,
    duration: number,
    excludeMentorIds: string[],
    fixedTimeOnly: boolean
): Promise<AlternativeMentor[]> {
    const dayOfWeek = getDay(scheduledAt);
    const sessionEndTime = addMinutes(scheduledAt, duration);
    const bookingTimeStr = `${scheduledAt.getHours().toString().padStart(2, '0')}:${scheduledAt.getMinutes().toString().padStart(2, '0')}`;
    const sessionEndStr = `${sessionEndTime.getHours().toString().padStart(2, '0')}:${sessionEndTime.getMinutes().toString().padStart(2, '0')}`;

    // Get all verified, available mentors with active schedules
    let mentorQuery = db
        .select({
            mentorId: mentors.id,
            userId: mentors.userId,
            scheduleId: mentorAvailabilitySchedules.id,
            bufferTime: mentorAvailabilitySchedules.bufferTimeBetweenSessions,
        })
        .from(mentors)
        .innerJoin(mentorAvailabilitySchedules, eq(mentors.id, mentorAvailabilitySchedules.mentorId))
        .where(
            and(
                eq(mentors.isAvailable, true),
                eq(mentors.verificationStatus, 'VERIFIED'),
                eq(mentorAvailabilitySchedules.isActive, true)
            )
        );

    const potentialMentors = await mentorQuery;

    // Filter out excluded mentors
    const filteredMentors = potentialMentors.filter(
        (m: { userId: string }) => !excludeMentorIds.includes(m.userId)
    );

    const availableMentors: AlternativeMentor[] = [];

    for (const mentor of filteredMentors) {
        // Check weekly pattern for the session day
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

        if (fixedTimeOnly && !isTimeSlotAvailable) continue;

        // Check for exceptions
        const exceptions = await db
            .select()
            .from(mentorAvailabilityExceptions)
            .where(eq(mentorAvailabilityExceptions.scheduleId, mentor.scheduleId));

        let isBlockedByException = false;
        for (const exception of exceptions) {
            const exStart = new Date(exception.startDate);
            const exEnd = new Date(exception.endDate);

            if (scheduledAt >= exStart && scheduledAt <= exEnd) {
                if (exception.type === 'BLOCKED' || exception.type === 'BREAK') {
                    if (exception.isFullDay) {
                        isBlockedByException = true;
                        break;
                    }
                }
            }
        }

        if (isBlockedByException) continue;

        // Check conflicting bookings
        const conflicts = await db
            .select()
            .from(sessions)
            .where(
                and(
                    eq(sessions.mentorId, mentor.userId),
                    inArray(sessions.status, ['scheduled', 'in_progress'])
                )
            );

        let hasConflict = false;
        const bufferMinutes = mentor.bufferTime || 0;

        for (const s of conflicts) {
            const existingStart = new Date(s.scheduledAt);
            const existingEnd = addMinutes(existingStart, s.duration || 60);
            const blockedStart = addMinutes(existingStart, -bufferMinutes);
            const blockedEnd = addMinutes(existingEnd, bufferMinutes);

            if (scheduledAt < blockedEnd && sessionEndTime > blockedStart) {
                hasConflict = true;
                break;
            }
        }

        if (fixedTimeOnly && hasConflict) continue;

        // Get mentor details
        const [mentorDetails] = await db
            .select({
                id: mentors.id,
                userId: mentors.userId,
                expertise: mentors.expertise,
                hourlyRate: mentors.hourlyRate,
            })
            .from(mentors)
            .where(eq(mentors.userId, mentor.userId))
            .limit(1);

        const [userDetails] = await db
            .select({
                name: users.name,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, mentor.userId))
            .limit(1);

        if (!mentorDetails || !userDetails) continue;

        availableMentors.push({
            id: mentorDetails.id,
            userId: mentorDetails.userId,
            name: userDetails.name || 'Unknown',
            avatar: userDetails.image || undefined,
            expertise: mentorDetails.expertise as string[] || [],
            hourlyRate: Number(mentorDetails.hourlyRate) || 0,
            isAvailableAtOriginalTime: isTimeSlotAvailable && !hasConflict,
        });
    }

    return availableMentors;
}

interface AlternativeMentor {
    id: string;
    userId: string;
    name: string;
    avatar?: string;
    expertise: string[];
    hourlyRate: number;
    isAvailableAtOriginalTime: boolean;
}
