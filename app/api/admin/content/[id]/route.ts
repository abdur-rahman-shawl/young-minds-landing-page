import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, mentors, users, courses, courseModules, courseSections, sectionContentItems, contentReviewAudit } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // Get content with mentor info (no ownership check — admin can view all)
    const contentResult = await db
      .select({
        content: mentorContent,
        mentorName: users.name,
        mentorEmail: users.email,
        mentorImage: users.image,
      })
      .from(mentorContent)
      .innerJoin(mentors, eq(mentorContent.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(mentorContent.id, id))
      .limit(1);

    if (!contentResult.length) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
    }

    const result = contentResult[0];

    // Deep fetch for COURSE type
    let courseData = null;
    if (result.content.type === 'COURSE') {
      const courseResult = await db.select()
        .from(courses)
        .where(eq(courses.contentId, id))
        .limit(1);

      if (courseResult.length) {
        const modules = await db.select()
          .from(courseModules)
          .where(eq(courseModules.courseId, courseResult[0].id))
          .orderBy(courseModules.orderIndex);

        const modulesWithSections = await Promise.all(
          modules.map(async (mod) => {
            const sections = await db.select()
              .from(courseSections)
              .where(eq(courseSections.moduleId, mod.id))
              .orderBy(courseSections.orderIndex);

            const sectionsWithItems = await Promise.all(
              sections.map(async (section) => {
                const items = await db.select()
                  .from(sectionContentItems)
                  .where(eq(sectionContentItems.sectionId, section.id))
                  .orderBy(sectionContentItems.orderIndex);

                return { ...section, contentItems: items };
              })
            );

            return { ...mod, sections: sectionsWithItems };
          })
        );

        courseData = { ...courseResult[0], modules: modulesWithSections };
      }
    }

    // Get review audit history
    const auditHistory = await db.select()
      .from(contentReviewAudit)
      .where(eq(contentReviewAudit.contentId, id))
      .orderBy(desc(contentReviewAudit.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        ...result.content,
        mentor: {
          name: result.mentorName,
          email: result.mentorEmail,
          image: result.mentorImage,
        },
        course: courseData,
        auditHistory,
      },
    });
  } catch (error) {
    console.error('Admin content detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content details' },
      { status: 500 }
    );
  }
}
