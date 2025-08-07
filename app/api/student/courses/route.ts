import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { 
  courseEnrollments, 
  courses, 
  mentorContent,
  mentees,
  users,
  mentors,
  courseCertificates
} from '@/lib/db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

// GET /api/student/courses - Get student's enrolled courses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const status = searchParams.get('status') || ''; // 'ACTIVE', 'COMPLETED', 'PAUSED'
    const sortBy = searchParams.get('sortBy') || 'enrolled_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get user from auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get mentee info, create if doesn't exist
    let userData = await db
      .select({ menteeId: mentees.id })
      .from(users)
      .leftJoin(mentees, eq(mentees.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData.length) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    let menteeId = userData[0].menteeId;

    // If user doesn't have a mentee record, create one
    if (!menteeId) {
      const newMentee = await db
        .insert(mentees)
        .values({
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: mentees.id });
      
      menteeId = newMentee[0].id;
    }

    const offset = (page - 1) * limit;

    // Build query
    let query = db
      .select({
        // Enrollment info
        enrollmentId: courseEnrollments.id,
        enrollmentStatus: courseEnrollments.status,
        paymentStatus: courseEnrollments.paymentStatus,
        enrolledAt: courseEnrollments.enrolledAt,
        lastAccessedAt: courseEnrollments.lastAccessedAt,
        completedAt: courseEnrollments.completedAt,
        overallProgress: courseEnrollments.overallProgress,
        timeSpentMinutes: courseEnrollments.timeSpentMinutes,
        currentModuleId: courseEnrollments.currentModuleId,
        currentSectionId: courseEnrollments.currentSectionId,
        
        // Course info
        courseId: courses.id,
        courseTitle: mentorContent.title,
        courseDescription: mentorContent.description,
        difficulty: courses.difficulty,
        duration: courses.duration,
        price: courses.price,
        currency: courses.currency,
        thumbnailUrl: courses.thumbnailUrl,
        category: courses.category,
        tags: courses.tags,
        
        // Mentor info
        mentorName: users.name,
        mentorImage: users.image,
        mentorTitle: mentors.title,
        mentorCompany: mentors.company,
        
        // Certificate info
        certificateStatus: courseCertificates.status,
        certificateEarnedAt: courseCertificates.earnedAt,
        certificateUrl: courseCertificates.certificateUrl,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .innerJoin(mentors, eq(mentorContent.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .leftJoin(courseCertificates, eq(courseCertificates.enrollmentId, courseEnrollments.id))
      .where(eq(courseEnrollments.menteeId, menteeId));

    // Apply status filter
    if (status) {
      query = query.where(and(
        eq(courseEnrollments.menteeId, menteeId),
        eq(courseEnrollments.status, status as any)
      ));
    }

    // Apply sorting
    const orderColumn = sortBy === 'progress' ? courseEnrollments.overallProgress :
                       sortBy === 'last_accessed' ? courseEnrollments.lastAccessedAt :
                       sortBy === 'completed_at' ? courseEnrollments.completedAt :
                       sortBy === 'enrolled_at' ? courseEnrollments.enrolledAt :
                       courseEnrollments.enrolledAt;

    query = query.orderBy(
      sortOrder === 'asc' ? orderColumn : desc(orderColumn)
    );

    // Apply pagination
    const enrolledCourses = await query.limit(limit).offset(offset);

    // Get total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(courseEnrollments)
      .where(
        status 
          ? and(
              eq(courseEnrollments.menteeId, menteeId),
              eq(courseEnrollments.status, status as any)
            )
          : eq(courseEnrollments.menteeId, menteeId)
      );

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get learning statistics
    const stats = await db
      .select({
        totalCourses: count(),
        activeCourses: sql<number>`COUNT(CASE WHEN ${courseEnrollments.status} = 'ACTIVE' THEN 1 END)`,
        completedCourses: sql<number>`COUNT(CASE WHEN ${courseEnrollments.status} = 'COMPLETED' THEN 1 END)`,
        totalTimeSpent: sql<number>`SUM(${courseEnrollments.timeSpentMinutes})`,
        averageProgress: sql<number>`AVG(CAST(${courseEnrollments.overallProgress} AS DECIMAL))`,
        totalCertificates: sql<number>`COUNT(CASE WHEN ${courseCertificates.status} = 'ISSUED' THEN 1 END)`,
      })
      .from(courseEnrollments)
      .leftJoin(courseCertificates, eq(courseCertificates.enrollmentId, courseEnrollments.id))
      .where(eq(courseEnrollments.menteeId, menteeId));

    const learningStats = stats[0] || {
      totalCourses: 0,
      activeCourses: 0,
      completedCourses: 0,
      totalTimeSpent: 0,
      averageProgress: 0,
      totalCertificates: 0,
    };

    // Process course data
    const processedCourses = enrolledCourses.map(course => ({
      enrollment: {
        id: course.enrollmentId,
        status: course.enrollmentStatus,
        paymentStatus: course.paymentStatus,
        enrolledAt: course.enrolledAt,
        lastAccessedAt: course.lastAccessedAt,
        completedAt: course.completedAt,
        overallProgress: Number(course.overallProgress) || 0,
        timeSpentMinutes: course.timeSpentMinutes || 0,
        currentModuleId: course.currentModuleId,
        currentSectionId: course.currentSectionId,
      },
      course: {
        id: course.courseId,
        title: course.courseTitle,
        description: course.courseDescription,
        difficulty: course.difficulty,
        duration: course.duration,
        price: course.price,
        currency: course.currency,
        thumbnailUrl: course.thumbnailUrl,
        category: course.category,
        tags: course.tags ? JSON.parse(course.tags) : [],
      },
      mentor: {
        name: course.mentorName,
        image: course.mentorImage,
        title: course.mentorTitle,
        company: course.mentorCompany,
      },
      certificate: course.certificateStatus ? {
        status: course.certificateStatus,
        earnedAt: course.certificateEarnedAt,
        certificateUrl: course.certificateUrl,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        courses: processedCourses,
        statistics: {
          ...learningStats,
          totalTimeSpent: Number(learningStats.totalTimeSpent) || 0,
          averageProgress: Number(learningStats.averageProgress) || 0,
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching student courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrolled courses' },
      { status: 500 }
    );
  }
}