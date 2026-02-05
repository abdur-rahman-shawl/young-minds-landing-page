import { db } from '@/lib/db';
import { adminSessionAuditTrail } from './schema/admin-session-audit-trail';

/**
 * Parameters for logging admin session actions
 */
interface LogAdminSessionActionParams {
    adminId: string;
    sessionId: string;
    action: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Admin Session Actions
 */
export const ADMIN_SESSION_ACTIONS = {
    FORCE_CANCEL: 'ADMIN_FORCE_CANCEL',
    FORCE_COMPLETE: 'ADMIN_FORCE_COMPLETE',
    MANUAL_REFUND: 'ADMIN_MANUAL_REFUND',
    REASSIGN_SESSION: 'ADMIN_REASSIGN_SESSION',
    CLEAR_NO_SHOW: 'ADMIN_CLEAR_NO_SHOW',
    POLICY_OVERRIDE: 'ADMIN_POLICY_OVERRIDE',
    NOTE_ADDED: 'ADMIN_NOTE_ADDED',
    DISPUTE_RESOLVED: 'ADMIN_DISPUTE_RESOLVED',
} as const;

export type AdminSessionAction = (typeof ADMIN_SESSION_ACTIONS)[keyof typeof ADMIN_SESSION_ACTIONS];

/**
 * Log an admin action on a session for audit purposes
 */
export async function logAdminSessionAction({
    adminId,
    sessionId,
    action,
    previousStatus,
    newStatus,
    reason,
    details,
    ipAddress,
    userAgent,
}: LogAdminSessionActionParams) {
    try {
        await db.insert(adminSessionAuditTrail).values({
            adminId,
            sessionId,
            action,
            previousStatus,
            newStatus,
            reason,
            details,
            ipAddress,
            userAgent,
        });
    } catch (error) {
        console.error('Failed to log admin session action:', error);
        // Don't throw - audit logging should not break the main action
    }
}
