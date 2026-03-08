import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { requireMentor } from '@/lib/api/guards';
import { getMentorForContent } from '@/lib/api/mentor-content';
import { db } from '@/lib/db';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { getPlanFeatures } from '@/lib/subscriptions/enforcement';
import {
  contentItemReviews,
  courseReviews,
  courses,
  mentees,
  mentorContent,
  sectionContentItems,
  users,
} from '@/lib/db/schema';

type MentorCourseCommentRow = {
  id: string;
  feedbackType: 'course' | 'content-item';
  courseId: string;
  courseTitle: string | null;
  contentItemId: string;
  contentItemTitle: string | null;
  rating: number;
  title: string | null;
  review: string | null;
  helpfulVotes: number;
  createdAt: Date;
  instructorResponse: string | null;
  instructorRespondedAt: Date | null;
  reviewerName: string | null;
  reviewerImage: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }

    const mentor = await getMentorForContent(guard.session.user.id);
    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const mentorPlanFeatures = await getPlanFeatures(guard.session.user.id, {
      audience: 'mentor',
      actorRole: 'mentor',
    }).catch(() => []);

    const hasCourseAccess = mentorPlanFeatures.some(
      (feature) => feature.feature_key === FEATURE_KEYS.COURSES_ACCESS && feature.is_included
    );

    if (!hasCourseAccess) {
      return NextResponse.json({ hasAccess: false, comments: [] });
    }

    const courseCommentRows = await db
      .select({
        id: courseReviews.id,
        courseId: courseReviews.courseId,
        courseTitle: mentorContent.title,
        contentItemId: courseReviews.courseId,
        contentItemTitle: mentorContent.title,
        rating: courseReviews.rating,
        title: courseReviews.title,
        review: courseReviews.review,
        helpfulVotes: courseReviews.helpfulVotes,
        createdAt: courseReviews.createdAt,
        instructorResponse: courseReviews.instructorResponse,
        instructorRespondedAt: courseReviews.instructorRespondedAt,
        reviewerName: users.name,
        reviewerImage: users.image,
      })
      .from(courseReviews)
      .innerJoin(courses, eq(courseReviews.courseId, courses.id))
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .innerJoin(mentees, eq(courseReviews.menteeId, mentees.id))
      .innerJoin(users, eq(mentees.userId, users.id))
      .where(and(eq(mentorContent.mentorId, mentor.id), eq(courseReviews.isPublished, true)))
      .orderBy(desc(courseReviews.createdAt));

    const lessonCommentRows = await db
      .select({
        id: contentItemReviews.id,
        courseId: contentItemReviews.courseId,
        courseTitle: mentorContent.title,
        contentItemId: contentItemReviews.contentItemId,
        contentItemTitle: sectionContentItems.title,
        rating: contentItemReviews.rating,
        title: contentItemReviews.title,
        review: contentItemReviews.review,
        helpfulVotes: contentItemReviews.helpfulVotes,
        createdAt: contentItemReviews.createdAt,
        instructorResponse: contentItemReviews.instructorResponse,
        instructorRespondedAt: contentItemReviews.instructorRespondedAt,
        reviewerName: users.name,
        reviewerImage: users.image,
      })
      .from(contentItemReviews)
      .innerJoin(courses, eq(contentItemReviews.courseId, courses.id))
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .innerJoin(sectionContentItems, eq(contentItemReviews.contentItemId, sectionContentItems.id))
      .innerJoin(mentees, eq(contentItemReviews.menteeId, mentees.id))
      .innerJoin(users, eq(mentees.userId, users.id))
      .where(and(eq(mentorContent.mentorId, mentor.id), eq(contentItemReviews.isPublished, true)))
      .orderBy(desc(contentItemReviews.createdAt));

    const courseComments: MentorCourseCommentRow[] = courseCommentRows.map((row) => ({
      ...row,
      feedbackType: 'course',
    }));

    const lessonComments: MentorCourseCommentRow[] = lessonCommentRows.map((row) => ({
      ...row,
      feedbackType: 'content-item',
    }));

    const comments = [...courseComments, ...lessonComments].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );

    return NextResponse.json({
      hasAccess: true,
      hasComments: comments.length > 0,
      comments,
    });
  } catch (error) {
    console.error('Failed to fetch mentor course comments:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching course comments.' },
      { status: 500 }
    );
  }
}
