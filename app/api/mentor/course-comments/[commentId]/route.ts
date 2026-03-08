import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';
import { getMentorForContent } from '@/lib/api/mentor-content';
import { db } from '@/lib/db';
import { contentItemReviews, courseReviews, courses, mentorContent } from '@/lib/db/schema';

const updateCommentReplySchema = z.object({
  feedbackType: z.enum(['course', 'content-item']),
  response: z.string().trim().min(1).max(2000),
});

interface RouteParams {
  params: Promise<{ commentId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const mentor = await getMentorForContent(guard.session.user.id);
    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const { commentId } = await params;
    const { feedbackType, response } = updateCommentReplySchema.parse(await request.json());

    if (feedbackType === 'course') {
      const [ownedComment] = await db
        .select({ id: courseReviews.id })
        .from(courseReviews)
        .innerJoin(courses, eq(courseReviews.courseId, courses.id))
        .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
        .where(and(eq(courseReviews.id, commentId), eq(mentorContent.mentorId, mentor.id)))
        .limit(1);

      if (!ownedComment) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      const [updated] = await db
        .update(courseReviews)
        .set({
          instructorResponse: response,
          instructorRespondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(courseReviews.id, commentId))
        .returning();

      return NextResponse.json({ comment: updated });
    }

    const [ownedComment] = await db
      .select({ id: contentItemReviews.id })
      .from(contentItemReviews)
      .innerJoin(courses, eq(contentItemReviews.courseId, courses.id))
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .where(and(eq(contentItemReviews.id, commentId), eq(mentorContent.mentorId, mentor.id)))
      .limit(1);

    if (!ownedComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const [updated] = await db
      .update(contentItemReviews)
      .set({
        instructorResponse: response,
        instructorRespondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentItemReviews.id, commentId))
      .returning();

    return NextResponse.json({ comment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid reply data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to update mentor course comment reply:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving the reply.' },
      { status: 500 }
    );
  }
}
