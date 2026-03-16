import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, mentors, contentReviewAudit } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireMentor } from '@/lib/api/guards';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const guard = await requireMentor(request, false);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;
    if (!session?.user) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    // Find mentor
    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Get content and verify ownership
    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id)
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const currentStatus = content[0].status;

    // Only DRAFT or REJECTED content can be submitted for review
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
      return NextResponse.json(
        { error: `Content with status '${currentStatus}' cannot be submitted for review. Only DRAFT or REJECTED content can be submitted.` },
        { status: 400 }
      );
    }

    // Update content status to PENDING_REVIEW
    const [updated] = await db.update(mentorContent)
      .set({
        status: 'PENDING_REVIEW',
        submittedForReviewAt: new Date(),
        reviewNote: null, // Clear any previous rejection note
        updatedAt: new Date(),
      })
      .where(eq(mentorContent.id, id))
      .returning();

    // Create audit log entry
    await db.insert(contentReviewAudit).values({
      contentId: id,
      mentorId: mentor[0].id,
      action: currentStatus === 'REJECTED' ? 'RESUBMITTED' : 'SUBMITTED',
      previousStatus: currentStatus,
      newStatus: 'PENDING_REVIEW',
      reviewedBy: null, // Mentor-initiated action
      note: null,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error submitting content for review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
