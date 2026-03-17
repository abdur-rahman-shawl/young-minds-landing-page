import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, contentReviewAudit } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';

async function ensureAdmin(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return { error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
    }

    const userWithRoles = await getUserWithRoles(session.user.id);
    const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

    if (!isAdmin) {
      return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
    }

    return { session };
  } catch (error) {
    console.error('Admin auth check failed:', error);
    return { error: NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 }) };
  }
}

const reviewSchema = z.object({
  action: z.enum([
    'APPROVE', 
    'REJECT', 
    'FLAG', 
    'UNFLAG', 
    'FORCE_APPROVE', 
    'FORCE_ARCHIVE', 
    'REVOKE_APPROVAL', 
    'FORCE_DELETE'
  ]),
  note: z.string().optional(),
});

type ReviewAction = z.infer<typeof reviewSchema>['action'];

const actionToAuditAction: Record<ReviewAction, typeof contentReviewAudit.$inferInsert['action']> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  FLAG: 'FLAGGED',
  UNFLAG: 'UNFLAGGED',
  FORCE_APPROVE: 'FORCE_APPROVED',
  FORCE_ARCHIVE: 'FORCE_ARCHIVED',
  REVOKE_APPROVAL: 'APPROVAL_REVOKED',
  FORCE_DELETE: 'FORCE_DELETED',
};
const PURGE_RETENTION_DAYS = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUserId = adminCheck.session.user.id;

    // Get content
    const content = await db.select()
      .from(mentorContent)
      .where(eq(mentorContent.id, id))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
    }

    const currentContent = content[0];
    const body = await request.json();
    const validatedData = reviewSchema.parse(body);
    const { action, note } = validatedData;
    const currentStatus = currentContent.status || 'DRAFT';

    if (currentContent.deletedAt && action !== 'FORCE_DELETE') {
      return NextResponse.json(
        { success: false, error: 'Content is deleted and pending purge' },
        { status: 400 }
      );
    }

    // State validation
    const allowedSourceStates: Record<string, string[]> = {
      'APPROVE': ['PENDING_REVIEW'],
      'REJECT': ['PENDING_REVIEW'],
      'FLAG': ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
      'UNFLAG': ['FLAGGED'],
      'FORCE_APPROVE': ['DRAFT', 'REJECTED', 'FLAGGED', 'ARCHIVED'],
      'FORCE_ARCHIVE': ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED'],
      'REVOKE_APPROVAL': ['APPROVED'],
      'FORCE_DELETE': ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED', 'FLAGGED'],
    };

    if (!allowedSourceStates[action].includes(currentStatus)) {
      return NextResponse.json(
        { success: false, error: `Action '${action}' not allowed from status '${currentStatus}'` },
        { status: 400 }
      );
    }

    // Note requirement validation
    if (['REJECT', 'FLAG', 'REVOKE_APPROVAL', 'FORCE_DELETE'].includes(action) && (!note || note.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: `A reason is required when performing action '${action}'` },
        { status: 400 }
      );
    }

    const now = new Date();
    const purgeAfter = new Date(now.getTime() + PURGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const updates: Partial<typeof mentorContent.$inferInsert> = { updatedAt: now };
    let newStatus = currentStatus;

    // Determine state changes based on action
    switch (action) {
      case 'APPROVE':
        newStatus = 'APPROVED';
        updates.reviewedAt = now;
        updates.reviewedBy = adminUserId;
        updates.reviewNote = null; // Clear any previous rejection note
        break;
        
      case 'FORCE_APPROVE':
        newStatus = 'APPROVED';
        updates.reviewedAt = now;
        updates.reviewedBy = adminUserId;
        updates.reviewNote = null;
        
        // If we are force approving from a flagged state, we need to clear flag data
        if (currentStatus === 'FLAGGED') {
          updates.flagReason = null;
          updates.flaggedAt = null;
          updates.flaggedBy = null;
          updates.statusBeforeArchive = null;
        }
        break;
      
      case 'REJECT':
      case 'REVOKE_APPROVAL':
        newStatus = 'REJECTED';
        updates.reviewedAt = now;
        updates.reviewedBy = adminUserId;
        updates.reviewNote = note;
        break;

      case 'FLAG':
        newStatus = 'FLAGGED';
        updates.statusBeforeArchive = currentStatus; // Store previous status so we can restore it on unflag
        updates.flagReason = note;
        updates.flaggedAt = now;
        updates.flaggedBy = adminUserId;
        break;

      case 'UNFLAG':
        // Restore to previous status, or default to DRAFT if none recorded
        newStatus = currentContent.statusBeforeArchive || 'DRAFT';
        updates.statusBeforeArchive = null; // Clear the memory
        updates.flagReason = null;
        updates.flaggedAt = null;
        updates.flaggedBy = null;
        break;

      case 'FORCE_ARCHIVE':
        newStatus = 'ARCHIVED';
        updates.statusBeforeArchive = currentStatus;
        
        // If we are force archiving flagged content, clear the flag explicitly
        if (currentStatus === 'FLAGGED') {
          updates.flagReason = null;
          updates.flaggedAt = null;
          updates.flaggedBy = null;
        }
        break;

      case 'FORCE_DELETE':
        // Phase 2: soft-delete with retention metadata for delayed purge.
        newStatus = 'ARCHIVED';
        updates.statusBeforeArchive = currentStatus === 'ARCHIVED'
          ? (currentContent.statusBeforeArchive || 'DRAFT')
          : currentStatus;
        updates.requireReviewAfterRestore = true;
        updates.deletedAt = now;
        updates.deletedBy = adminUserId;
        updates.deleteReason = note || null;
        updates.purgeAfterAt = purgeAfter;
        updates.reviewedAt = now;
        updates.reviewedBy = adminUserId;
        if (currentStatus === 'FLAGGED') {
          updates.flagReason = null;
          updates.flaggedAt = null;
          updates.flaggedBy = null;
        }
        break;
    }

    updates.status = newStatus as any;

    const [updated] = await db.transaction(async (tx: any) => {
      const rows = await tx.update(mentorContent)
        .set(updates)
        .where(eq(mentorContent.id, id))
        .returning();

      if (!rows.length) {
        return rows;
      }

      if (currentContent.mentorId) {
        await tx.insert(contentReviewAudit).values({
          contentId: id,
          mentorId: currentContent.mentorId,
          action: actionToAuditAction[action],
          previousStatus: currentStatus,
          newStatus,
          reviewedBy: adminUserId,
          note: note || null,
        });
      }

      return rows;
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin content review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to review content' },
      { status: 500 }
    );
  }
}
