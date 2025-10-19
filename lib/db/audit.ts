import { db } from '@/lib/db';
import { adminAuditTrail } from './schema/admin-audit-trail';

interface LogAdminActionParams {
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
}

export async function logAdminAction({
  adminId,
  action,
  targetId,
  targetType,
  details,
}: LogAdminActionParams) {
  try {
    await db.insert(adminAuditTrail).values({
      adminId,
      action,
      targetId,
      targetType,
      details,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Optionally, you could re-throw the error or handle it in another way
  }
}
