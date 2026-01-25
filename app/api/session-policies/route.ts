import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionPolicies } from '@/lib/db/schema';
import { DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';
import { eq } from 'drizzle-orm';

// Helper to get policy value from DB with fallback
async function getPolicyValue(key: string, defaultValue: string): Promise<string> {
    const policy = await db
        .select()
        .from(sessionPolicies)
        .where(eq(sessionPolicies.policyKey, key))
        .limit(1);

    return policy.length > 0 ? policy[0].policyValue : defaultValue;
}

// GET /api/session-policies - Fetch all session policies
export async function GET(req: NextRequest) {
    try {
        // Get role from query params (optional, for role-specific policies)
        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role') as 'mentor' | 'mentee' | null;

        // Fetch all relevant policies
        const [
            cancellationCutoffHours,
            rescheduleCutoffHours,
            maxReschedules,
            mentorCancellationCutoffHours,
            mentorRescheduleCutoffHours,
            mentorMaxReschedules,
            freeCancellationHours,
        ] = await Promise.all([
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.CANCELLATION_CUTOFF_HOURS.key,
                DEFAULT_SESSION_POLICIES.CANCELLATION_CUTOFF_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.key,
                DEFAULT_SESSION_POLICIES.RESCHEDULE_CUTOFF_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.key,
                DEFAULT_SESSION_POLICIES.MAX_RESCHEDULES_PER_SESSION.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.MENTOR_CANCELLATION_CUTOFF_HOURS.key,
                DEFAULT_SESSION_POLICIES.MENTOR_CANCELLATION_CUTOFF_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.MENTOR_RESCHEDULE_CUTOFF_HOURS.key,
                DEFAULT_SESSION_POLICIES.MENTOR_RESCHEDULE_CUTOFF_HOURS.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.MENTOR_MAX_RESCHEDULES_PER_SESSION.key,
                DEFAULT_SESSION_POLICIES.MENTOR_MAX_RESCHEDULES_PER_SESSION.value
            ),
            getPolicyValue(
                DEFAULT_SESSION_POLICIES.FREE_CANCELLATION_HOURS.key,
                DEFAULT_SESSION_POLICIES.FREE_CANCELLATION_HOURS.value
            ),
        ]);

        // Return role-specific policies if role is specified
        if (role === 'mentor') {
            return NextResponse.json({
                cancellationCutoffHours: parseInt(mentorCancellationCutoffHours),
                rescheduleCutoffHours: parseInt(mentorRescheduleCutoffHours),
                maxReschedules: parseInt(mentorMaxReschedules),
                freeCancellationHours: parseInt(freeCancellationHours),
            });
        }

        if (role === 'mentee') {
            return NextResponse.json({
                cancellationCutoffHours: parseInt(cancellationCutoffHours),
                rescheduleCutoffHours: parseInt(rescheduleCutoffHours),
                maxReschedules: parseInt(maxReschedules),
                freeCancellationHours: parseInt(freeCancellationHours),
            });
        }

        // Return all policies if no role specified
        return NextResponse.json({
            mentee: {
                cancellationCutoffHours: parseInt(cancellationCutoffHours),
                rescheduleCutoffHours: parseInt(rescheduleCutoffHours),
                maxReschedules: parseInt(maxReschedules),
            },
            mentor: {
                cancellationCutoffHours: parseInt(mentorCancellationCutoffHours),
                rescheduleCutoffHours: parseInt(mentorRescheduleCutoffHours),
                maxReschedules: parseInt(mentorMaxReschedules),
            },
            freeCancellationHours: parseInt(freeCancellationHours),
        });

    } catch (error) {
        console.error('Error fetching session policies:', error);
        return NextResponse.json(
            { error: 'Failed to fetch session policies' },
            { status: 500 }
        );
    }
}
