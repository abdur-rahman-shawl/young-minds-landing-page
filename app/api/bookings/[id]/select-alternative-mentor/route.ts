import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';

const selectMentorSchema = z.object({
    newMentorId: z.string().min(1, 'New mentor ID is required'),
    scheduledAt: z.string().datetime().optional(), // Only for scenario B (no mentor found)
});

/**
 * POST /api/bookings/[id]/select-alternative-mentor
 * 
 * Allows mentee to select a different mentor for their session
 * after the original mentor cancelled.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: sessionId } = await params;
        const body = await request.json();

        // Validate request
        const validation = selectMentorSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const { newMentorId, scheduledAt } = validation.data;

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

        // Verify session is in a reassignable state
        const validStatuses = ['pending_acceptance', 'awaiting_mentee_choice'];
        if (!validStatuses.includes(booking.reassignmentStatus || '')) {
            return NextResponse.json(
                { error: 'Session is not in a reassignable state' },
                { status: 400 }
            );
        }

        // Get the new mentor's name for notification
        const [newMentorUser] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, newMentorId))
            .limit(1);

        if (!newMentorUser) {
            return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
        }

        // Update the session with new mentor
        const updateData: Record<string, any> = {
            mentorId: newMentorId,
            reassignmentStatus: 'accepted',
            wasReassigned: true,
            reassignedAt: new Date(),
            updatedAt: new Date(),
        };

        // If scheduledAt is provided (Scenario B), update the time too
        if (scheduledAt) {
            updateData.scheduledAt = new Date(scheduledAt);
        }

        await db
            .update(sessions)
            .set(updateData)
            .where(eq(sessions.id, sessionId));

        // TODO: Send notification to new mentor
        // TODO: Log audit entry

        return NextResponse.json({
            success: true,
            message: `Session has been assigned to ${newMentorUser.name}.`,
            newMentorName: newMentorUser.name,
            scheduledAt: scheduledAt || booking.scheduledAt.toISOString(),
        });

    } catch (error) {
        console.error('Error selecting alternative mentor:', error);
        return NextResponse.json(
            { error: 'Failed to select alternative mentor' },
            { status: 500 }
        );
    }
}
