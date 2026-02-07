import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionPolicies } from '@/lib/db/schema';
import { DEFAULT_SESSION_POLICIES } from '@/lib/db/schema/session-policies';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';

// Ensure admin access
async function ensureAdmin(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
            return { error: 'Authentication required', status: 401, user: null };
        }

        const userWithRoles = await getUserWithRoles(session.user.id);
        const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

        if (!isAdmin) {
            return { error: 'Admin access required', status: 403, user: null };
        }

        return { error: null, status: 200, user: session.user };
    } catch (error) {
        console.error('Admin auth check failed:', error);
        return { error: 'Authentication failed', status: 401, user: null };
    }
}

// Helper to get policy value from DB with fallback
async function getPolicyValue(key: string, defaultValue: string): Promise<string> {
    const policy = await db
        .select()
        .from(sessionPolicies)
        .where(eq(sessionPolicies.policyKey, key))
        .limit(1);

    return policy.length > 0 ? policy[0].policyValue : defaultValue;
}

// Helper to get all policies with defaults
async function getAllPolicies() {
    const policyKeys = Object.values(DEFAULT_SESSION_POLICIES);

    const results = await Promise.all(
        policyKeys.map(async (policy) => {
            const value = await getPolicyValue(policy.key, policy.value);
            return {
                key: policy.key,
                value,
                type: policy.type,
                description: policy.description,
                defaultValue: policy.value,
            };
        })
    );

    return results;
}

// GET /api/admin/policies - Fetch all session policies with metadata
export async function GET(request: NextRequest) {
    const adminCheck = await ensureAdmin(request);
    if (adminCheck.error) {
        return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const policies = await getAllPolicies();

        // Group policies for easier frontend consumption
        const grouped = {
            menteeRules: policies.filter(p =>
                ['cancellation_cutoff_hours', 'reschedule_cutoff_hours', 'max_reschedules_per_session'].includes(p.key)
            ),
            mentorRules: policies.filter(p =>
                ['mentor_cancellation_cutoff_hours', 'mentor_reschedule_cutoff_hours', 'mentor_max_reschedules_per_session'].includes(p.key)
            ),
            refundRules: policies.filter(p =>
                ['free_cancellation_hours', 'partial_refund_percentage', 'late_cancellation_refund_percentage', 'require_cancellation_reason'].includes(p.key)
            ),
            rescheduleSettings: policies.filter(p =>
                ['reschedule_request_expiry_hours', 'max_counter_proposals'].includes(p.key)
            ),
        };

        return NextResponse.json({
            success: true,
            data: {
                policies,
                grouped,
            },
        });
    } catch (error) {
        console.error('Error fetching policies:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch policies' },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/policies - Update multiple policies
export async function PATCH(request: NextRequest) {
    const adminCheck = await ensureAdmin(request);
    if (adminCheck.error) {
        return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const body = await request.json();
        const { updates } = body as { updates: { key: string; value: string }[] };

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Updates array is required' },
                { status: 400 }
            );
        }

        // Validate all keys exist in DEFAULT_SESSION_POLICIES
        const validKeys = Object.values(DEFAULT_SESSION_POLICIES).map(p => p.key);
        const invalidKeys = updates.filter(u => !validKeys.includes(u.key));
        if (invalidKeys.length > 0) {
            return NextResponse.json(
                { success: false, error: `Invalid policy keys: ${invalidKeys.map(k => k.key).join(', ')}` },
                { status: 400 }
            );
        }

        // Get current values for audit log
        const previousValues: Record<string, string> = {};
        for (const update of updates) {
            const policyDef = Object.values(DEFAULT_SESSION_POLICIES).find(p => p.key === update.key);
            previousValues[update.key] = await getPolicyValue(update.key, policyDef?.value || '');
        }

        // Perform updates (upsert)
        for (const update of updates) {
            const existing = await db
                .select()
                .from(sessionPolicies)
                .where(eq(sessionPolicies.policyKey, update.key))
                .limit(1);

            const policyDef = Object.values(DEFAULT_SESSION_POLICIES).find(p => p.key === update.key);

            if (existing.length > 0) {
                // Update existing
                await db
                    .update(sessionPolicies)
                    .set({
                        policyValue: update.value,
                        updatedAt: new Date(),
                    })
                    .where(eq(sessionPolicies.policyKey, update.key));
            } else {
                // Insert new
                await db.insert(sessionPolicies).values({
                    policyKey: update.key,
                    policyValue: update.value,
                    policyType: policyDef?.type || 'string',
                    description: policyDef?.description || null,
                });
            }
        }

        // Log to audit trail
        await logAdminSessionAction({
            adminId: adminCheck.user!.id,
            sessionId: null, // Not session-specific
            action: 'ADMIN_POLICY_UPDATED',
            previousStatus: null,
            newStatus: null,
            reason: `Updated ${updates.length} policy setting(s)`,
            details: {
                updates: updates.map(u => ({
                    key: u.key,
                    previousValue: previousValues[u.key],
                    newValue: u.value,
                })),
            },
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Updated ${updates.length} policy setting(s)`,
        });
    } catch (error) {
        console.error('Error updating policies:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update policies' },
            { status: 500 }
        );
    }
}

// POST /api/admin/policies - Reset all policies to defaults
export async function POST(request: NextRequest) {
    const adminCheck = await ensureAdmin(request);
    if (adminCheck.error) {
        return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const body = await request.json();
        const { action } = body as { action: string };

        if (action !== 'reset') {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "reset" to restore defaults.' },
                { status: 400 }
            );
        }

        // Get current values for audit log
        const previousPolicies = await getAllPolicies();

        // Reset all policies to default values (upsert, not delete!)
        const policyDefs = Object.values(DEFAULT_SESSION_POLICIES);

        for (const policyDef of policyDefs) {
            const existing = await db
                .select()
                .from(sessionPolicies)
                .where(eq(sessionPolicies.policyKey, policyDef.key))
                .limit(1);

            if (existing.length > 0) {
                // Update existing row to default value
                await db
                    .update(sessionPolicies)
                    .set({
                        policyValue: policyDef.value,
                        updatedAt: new Date(),
                    })
                    .where(eq(sessionPolicies.policyKey, policyDef.key));
            } else {
                // Insert default value
                await db.insert(sessionPolicies).values({
                    policyKey: policyDef.key,
                    policyValue: policyDef.value,
                    policyType: policyDef.type,
                    description: policyDef.description,
                });
            }
        }

        // Log to audit trail
        await logAdminSessionAction({
            adminId: adminCheck.user!.id,
            sessionId: null,
            action: 'ADMIN_POLICY_RESET',
            previousStatus: null,
            newStatus: null,
            reason: 'Reset all policies to default values',
            details: {
                previousPolicies: previousPolicies.map(p => ({
                    key: p.key,
                    previousValue: p.value,
                    defaultValue: p.defaultValue,
                })),
            },
            request,
        });

        return NextResponse.json({
            success: true,
            message: 'All policies have been reset to defaults',
        });
    } catch (error) {
        console.error('Error resetting policies:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to reset policies' },
            { status: 500 }
        );
    }
}
