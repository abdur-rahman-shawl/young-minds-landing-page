import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, mentors, contentReviewAudit } from '@/lib/db/schema';
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

    // State validation
    const allowedSourceStates: Record<string, string[]> = {
      'APPROVE': ['PENDING_REVIEW'],
      'REJECT': ['PENDING_REVIEW'],
      'FLAG': ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
      'UNFLAG': ['FLAGGED'],
      'FORCE_APPROVE': ['DRAFT', 'REJECTED', 'FLAGGED'],
      'FORCE_ARCHIVE': ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED'],
      'REVOKE_APPROVAL': ['APPROVED'],
      'FORCE_DELETE': ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED', 'FLAGGED'],
    };

    if (!allowedSourceStates[action].includes(currentContent.status!)) {
      return NextResponse.json(
        { success: false, error: `Action '${action}' not allowed from status '${currentContent.status}'` },
        { status: 400 }
      );
    }

    // Note requirement validation
    if (['REJECT', 'FLAG', 'REVOKE_APPROVAL'].includes(action) && (!note || note.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: `A reason is required when performing action '${action}'` },
        { status: 400 }
      );
    }

    // Special case: FORCE_DELETE (row deletion)
    if (action === 'FORCE_DELETE') {
      await db.delete(mentorContent).where(eq(mentorContent.id, id));
      return NextResponse.json({ success: true, data: { deleted: true } });
    }

    const now = new Date();
    const updates: Partial<typeof mentorContent.$inferInsert> = { updatedAt: now };
    let newStatus = currentContent.status;

    // Determine state changes based on action
    switch (action) {
      case 'APPROVE':
      case 'FORCE_APPROVE':
        newStatus = 'APPROVED';
        updates.reviewedAt = now;
        updates.reviewedBy = adminUserId;
        if (action === 'APPROVE') updates.reviewNote = null;
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
        updates.statusBeforeArchive = currentContent.status; // store previous status here as well
        updates.flagReason = note;
        updates.flaggedAt = now;
        updates.flaggedBy = adminUserId;
        break;

      case 'UNFLAG':
        newStatus = currentContent.statusBeforeArchive || 'DRAFT';
        updates.statusBeforeArchive = null;
        updates.flagReason = null;
        updates.flaggedAt = null;
        updates.flaggedBy = null;
        break;

      case 'FORCE_ARCHIVE':
        newStatus = 'ARCHIVED';
        updates.statusBeforeArchive = currentContent.status;
        break;
    }

    updates.status = newStatus as any;

    // Update content status
    const [updated] = await db.update(mentorContent)
      .set(updates)
      .where(eq(mentorContent.id, id))
      .returning();

    // Create audit log entry
    await db.insert(contentReviewAudit).values({
      contentId: id,
      mentorId: currentContent.mentorId!,
      action: action as any,
      previousStatus: currentContent.status,
      newStatus,
      reviewedBy: adminUserId,
      note: note || null,
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
