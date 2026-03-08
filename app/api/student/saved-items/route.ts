import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  courseEnrollments,
  courseProgress,
  courseModules,
  courseSections,
  courses,
  mentees,
  mentorContent,
  sectionContentItems,
  mentors,
  users,
} from '@/lib/db/schema';
import { rateLimit, RateLimitError } from '@/lib/rate-limit';

const savedItemsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/student/saved-items
export async function GET(request: NextRequest) {
  try {
    savedItemsRateLimit.check(request);

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const mentorUsers = alias(users, 'mentor_users');

    const rows = await db
      .select({
        contentItemId: sectionContentItems.id,
        contentItemTitle: sectionContentItems.title,
        contentItemType: sectionContentItems.type,
        courseId: courses.id,
        courseTitle: mentorContent.title,
        moduleTitle: courseModules.title,
        sectionTitle: courseSections.title,
        bookmarkedAt: courseProgress.bookmarkedAt,
        mentorName: mentorUsers.name,
      })
      .from(users)
      .innerJoin(mentees, eq(mentees.userId, users.id))
      .innerJoin(courseEnrollments, eq(courseEnrollments.menteeId, mentees.id))
      .innerJoin(courseProgress, eq(courseProgress.enrollmentId, courseEnrollments.id))
      .innerJoin(sectionContentItems, eq(courseProgress.contentItemId, sectionContentItems.id))
      .innerJoin(courseSections, eq(sectionContentItems.sectionId, courseSections.id))
      .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
      .innerJoin(courses, eq(courseModules.courseId, courses.id))
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .innerJoin(mentors, eq(mentorContent.mentorId, mentors.id))
      .innerJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
      .where(
        and(
          eq(users.id, session.user.id),
          sql`${courseProgress.bookmarkedAt} IS NOT NULL`
        )
      )
      .orderBy(desc(courseProgress.bookmarkedAt));

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode, headers: { 'Retry-After': error.retryAfter.toString() } }
      );
    }

    console.error('Error fetching saved items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved items' },
      { status: 500 }
    );
  }
}

// DELETE /api/student/saved-items?courseId=...&itemId=...
export async function DELETE(request: NextRequest) {
  try {
    savedItemsRateLimit.check(request);

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const itemId = searchParams.get('itemId');

    if (!courseId || !itemId || !uuidRegex.test(courseId) || !uuidRegex.test(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course or item id' },
        { status: 400 }
      );
    }

    const enrollment = await db
      .select({
        enrollmentId: courseEnrollments.id,
      })
      .from(users)
      .innerJoin(mentees, eq(mentees.userId, users.id))
      .innerJoin(courseEnrollments, and(
        eq(courseEnrollments.menteeId, mentees.id),
        eq(courseEnrollments.courseId, courseId)
      ))
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!enrollment.length) {
      return NextResponse.json(
        { success: false, error: 'Not enrolled in this course' },
        { status: 404 }
      );
    }

    const [existing] = await db
      .select({ id: courseProgress.id })
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.enrollmentId, enrollment[0].enrollmentId),
          eq(courseProgress.contentItemId, itemId),
          sql`${courseProgress.bookmarkedAt} IS NOT NULL`
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Saved item not found' },
        { status: 404 }
      );
    }

    await db
      .update(courseProgress)
      .set({ bookmarkedAt: null, updatedAt: new Date() })
      .where(eq(courseProgress.id, existing.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode, headers: { 'Retry-After': error.retryAfter.toString() } }
      );
    }

    console.error('Error removing saved item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove saved item' },
      { status: 500 }
    );
  }
}
