import { db } from '@/lib/db';
import { adminSessionAuditTrail } from './schema/admin-session-audit-trail';

/**
 * Parameters for logging admin session actions
 */
interface LogAdminSessionActionParams {
    adminId: string;
    sessionId: string | null;
    action: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    reason?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    request?: Request; // Optional: extract IP and UA automatically
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
    POLICY_UPDATED: 'ADMIN_POLICY_UPDATED',
    POLICY_RESET: 'ADMIN_POLICY_RESET',
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
    request,
}: LogAdminSessionActionParams) {
    try {
        // Extract IP and User Agent from request if provided
        const finalIpAddress = ipAddress ||
            request?.headers.get('x-forwarded-for')?.split(',')[0] ||
            request?.headers.get('x-real-ip') ||
            undefined;
        const finalUserAgent = userAgent || request?.headers.get('user-agent') || undefined;

        await db.insert(adminSessionAuditTrail).values({
            adminId,
            sessionId,
            action,
            previousStatus,
            newStatus,
            reason,
            details,
            ipAddress: finalIpAddress,
            userAgent: finalUserAgent,
        });
    } catch (error) {
        console.error('Failed to log admin session action:', error);
        // Don't throw - audit logging should not break the main action
    }
}
