import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { 
  courseProgress, 
  courseEnrollments,
  courses,
  sectionContentItems,
  courseSections,
  courseModules,
  mentees,
  users,
  courseAnalytics
} from '@/lib/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import { resolveStorageUrl } from '@/lib/storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/courses/[id]/progress - Get course progress for student
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;
    
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

    // Get mentee and enrollment info
    const enrollmentData = await db
      .select({
        enrollmentId: courseEnrollments.id,
        menteeId: mentees.id,
        overallProgress: courseEnrollments.overallProgress,
        timeSpentMinutes: courseEnrollments.timeSpentMinutes,
        currentModuleId: courseEnrollments.currentModuleId,
        currentSectionId: courseEnrollments.currentSectionId,
        lastAccessedAt: courseEnrollments.lastAccessedAt,
      })
      .from(users)
      .innerJoin(mentees, eq(mentees.userId, users.id))
      .innerJoin(courseEnrollments, and(
        eq(courseEnrollments.menteeId, mentees.id),
        eq(courseEnrollments.courseId, courseId)
      ))
      .where(eq(users.id, userId))
      .limit(1);

    if (!enrollmentData.length) {
      return NextResponse.json(
        { success: false, error: 'Not enrolled in this course' },
        { status: 404 }
      );
    }

    const enrollment = enrollmentData[0];

    // Get detailed progress for each content item
    const progressData = await db
      .select({
        // Content item info
        contentItemId: sectionContentItems.id,
        contentItemTitle: sectionContentItems.title,
        contentItemType: sectionContentItems.type,
        contentItemDuration: sectionContentItems.duration,
        contentItemOrderIndex: sectionContentItems.orderIndex,
        contentItemFileUrl: sectionContentItems.fileUrl,
        contentItemContent: sectionContentItems.content,
        contentItemFileName: sectionContentItems.fileName,
        contentItemMimeType: sectionContentItems.mimeType,
        
        // Section info
        sectionId: courseSections.id,
        sectionTitle: courseSections.title,
        sectionOrderIndex: courseSections.orderIndex,
        
        // Module info
        moduleId: courseModules.id,
        moduleTitle: courseModules.title,
        moduleOrderIndex: courseModules.orderIndex,
        
        // Progress info
        progressId: courseProgress.id,
        status: courseProgress.status,
        progressPercentage: courseProgress.progressPercentage,
        timeSpentSeconds: courseProgress.timeSpentSeconds,
        lastWatchedPosition: courseProgress.lastWatchedPosition,
        watchCount: courseProgress.watchCount,
        firstStartedAt: courseProgress.firstStartedAt,
        lastAccessedAt: courseProgress.lastAccessedAt,
        completedAt: courseProgress.completedAt,
        studentNotes: courseProgress.studentNotes,
        bookmarkedAt: courseProgress.bookmarkedAt,
      })
      .from(courseModules)
      .innerJoin(courseSections, eq(courseSections.moduleId, courseModules.id))
      .innerJoin(sectionContentItems, eq(sectionContentItems.sectionId, courseSections.id))
      .leftJoin(courseProgress, and(
        eq(courseProgress.contentItemId, sectionContentItems.id),
        eq(courseProgress.enrollmentId, enrollment.enrollmentId)
      ))
      .where(eq(courseModules.courseId, courseId))
      .orderBy(
        courseModules.orderIndex,
        courseSections.orderIndex,
        sectionContentItems.orderIndex
      );

    // Structure the progress data
    const modulesMap = new Map();
    let totalContentItems = 0;
    let completedItems = 0;
    let totalDuration = 0;
    let completedDuration = 0;

    progressData.forEach((item) => {
      totalContentItems++;
      totalDuration += item.contentItemDuration || 0;

      if (item.status === 'COMPLETED') {
        completedItems++;
        completedDuration += item.contentItemDuration || 0;
      }

      // Structure modules
      if (!modulesMap.has(item.moduleId)) {
        modulesMap.set(item.moduleId, {
          id: item.moduleId,
          title: item.moduleTitle,
          orderIndex: item.moduleOrderIndex,
          sections: new Map(),
          progress: {
            totalItems: 0,
            completedItems: 0,
            overallProgress: 0,
          },
        });
      }

      const moduleData = modulesMap.get(item.moduleId);
      moduleData.progress.totalItems++;

      // Structure sections
      if (!moduleData.sections.has(item.sectionId)) {
        moduleData.sections.set(item.sectionId, {
          id: item.sectionId,
          title: item.sectionTitle,
          orderIndex: item.sectionOrderIndex,
          contentItems: [],
          progress: {
            totalItems: 0,
            completedItems: 0,
            overallProgress: 0,
          },
        });
      }

      const section = moduleData.sections.get(item.sectionId);
      section.progress.totalItems++;

      // Add content item with progress
      section.contentItems.push({
        id: item.contentItemId,
        title: item.contentItemTitle,
        type: item.contentItemType,
        duration: item.contentItemDuration,
        orderIndex: item.contentItemOrderIndex,
        fileUrl: item.contentItemFileUrl,
        content: item.contentItemContent,
        fileName: item.contentItemFileName,
        mimeType: item.contentItemMimeType,
        progress: item.progressId ? {
          id: item.progressId,
          status: item.status,
          progressPercentage: Number(item.progressPercentage) || 0,
          timeSpentSeconds: item.timeSpentSeconds || 0,
          lastWatchedPosition: item.lastWatchedPosition || 0,
          watchCount: item.watchCount || 0,
          firstStartedAt: item.firstStartedAt,
          lastAccessedAt: item.lastAccessedAt,
          completedAt: item.completedAt,
          studentNotes: item.studentNotes,
          isBookmarked: !!item.bookmarkedAt,
        } : {
          status: 'NOT_STARTED',
          progressPercentage: 0,
          timeSpentSeconds: 0,
          lastWatchedPosition: 0,
          watchCount: 0,
          isBookmarked: false,
        },
      });

      // Update section progress
      if (item.status === 'COMPLETED') {
        section.progress.completedItems++;
        moduleData.progress.completedItems++;
      }
    });

    // Calculate progress percentages for modules and sections
    const processedModules = Array.from(modulesMap.values()).map(module => {
      const sections = Array.from(module.sections.values()).map(section => {
        section.progress.overallProgress = section.progress.totalItems > 0 
          ? Math.round((section.progress.completedItems / section.progress.totalItems) * 100)
          : 0;
        return {
          ...section,
          contentItems: section.contentItems.sort((a, b) => a.orderIndex - b.orderIndex),
        };
      }).sort((a, b) => a.orderIndex - b.orderIndex);

      module.progress.overallProgress = module.progress.totalItems > 0 
        ? Math.round((module.progress.completedItems / module.progress.totalItems) * 100)
        : 0;

      return {
        ...module,
        sections,
      };
    }).sort((a, b) => a.orderIndex - b.orderIndex);

    const hydratedModules = await Promise.all(
      processedModules.map(async (module) => ({
        ...module,
        sections: await Promise.all(
          module.sections.map(async (section) => ({
            ...section,
            contentItems: await Promise.all(
              section.contentItems.map(async (item) => ({
                ...item,
                fileUrl: await resolveStorageUrl(item.fileUrl),
              }))
            ),
          }))
        ),
      }))
    );

    // Calculate overall course progress
    const overallProgress = totalContentItems > 0 
      ? Math.round((completedItems / totalContentItems) * 100)
      : 0;

    // Get recent activity
    const recentActivity = await db
      .select({
        contentItemTitle: sectionContentItems.title,
        sectionTitle: courseSections.title,
        moduleTitle: courseModules.title,
        activityType: courseProgress.status,
        timestamp: courseProgress.lastAccessedAt,
      })
      .from(courseProgress)
      .innerJoin(sectionContentItems, eq(courseProgress.contentItemId, sectionContentItems.id))
      .innerJoin(courseSections, eq(sectionContentItems.sectionId, courseSections.id))
      .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
      .where(eq(courseProgress.enrollmentId, enrollment.enrollmentId))
      .orderBy(sql`${courseProgress.lastAccessedAt} DESC NULLS LAST`)
      .limit(10);

    // Get bookmarked items
    const bookmarks = await db
      .select({
        contentItemId: sectionContentItems.id,
        contentItemTitle: sectionContentItems.title,
        sectionTitle: courseSections.title,
        moduleTitle: courseModules.title,
        bookmarkedAt: courseProgress.bookmarkedAt,
        studentNotes: courseProgress.studentNotes,
      })
      .from(courseProgress)
      .innerJoin(sectionContentItems, eq(courseProgress.contentItemId, sectionContentItems.id))
      .innerJoin(courseSections, eq(sectionContentItems.sectionId, courseSections.id))
      .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
      .where(and(
        eq(courseProgress.enrollmentId, enrollment.enrollmentId),
        sql`${courseProgress.bookmarkedAt} IS NOT NULL`
      ))
      .orderBy(sql`${courseProgress.bookmarkedAt} DESC`);

    return NextResponse.json({
      success: true,
      data: {
        enrollment: {
          id: enrollment.enrollmentId,
          overallProgress: Number(enrollment.overallProgress) || overallProgress,
          timeSpentMinutes: enrollment.timeSpentMinutes || 0,
          currentModuleId: enrollment.currentModuleId,
          currentSectionId: enrollment.currentSectionId,
          lastAccessedAt: enrollment.lastAccessedAt,
        },
        progress: {
          overallProgress,
          totalContentItems,
          completedItems,
          totalDurationSeconds: totalDuration,
          completedDurationSeconds: completedDuration,
        modules: hydratedModules,
        },
        recentActivity,
        bookmarks,
      },
    });

  } catch (error) {
    console.error('Error fetching course progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course progress' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/progress - Update progress for a content item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;
    const body = await request.json();
    
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

    const {
      contentItemId,
      status,
      progressPercentage = 0,
      timeSpentSeconds = 0,
      lastWatchedPosition = 0,
      studentNotes,
      isBookmarked = false,
      eventType = 'progress_update', // for analytics
    } = body;

    if (!contentItemId) {
      return NextResponse.json(
        { success: false, error: 'Content item ID is required' },
        { status: 400 }
      );
    }

    // Get enrollment info
    const enrollmentData = await db
      .select({
        enrollmentId: courseEnrollments.id,
        menteeId: mentees.id,
      })
      .from(users)
      .innerJoin(mentees, eq(mentees.userId, users.id))
      .innerJoin(courseEnrollments, and(
        eq(courseEnrollments.menteeId, mentees.id),
        eq(courseEnrollments.courseId, courseId)
      ))
      .where(eq(users.id, userId))
      .limit(1);

    if (!enrollmentData.length) {
      return NextResponse.json(
        { success: false, error: 'Not enrolled in this course' },
        { status: 404 }
      );
    }

    const { enrollmentId } = enrollmentData[0];

    // Upsert progress record
    const now = new Date();
    const progressData = {
      enrollmentId,
      contentItemId,
      status: status || 'IN_PROGRESS',
      progressPercentage: progressPercentage.toString(),
      timeSpentSeconds,
      lastWatchedPosition,
      lastAccessedAt: now,
      studentNotes,
      ...(status === 'COMPLETED' && { completedAt: now }),
      ...(isBookmarked && { bookmarkedAt: now }),
    };

    // Check if progress record exists
    const existingProgress = await db
      .select({ id: courseProgress.id, firstStartedAt: courseProgress.firstStartedAt })
      .from(courseProgress)
      .where(and(
        eq(courseProgress.enrollmentId, enrollmentId),
        eq(courseProgress.contentItemId, contentItemId)
      ))
      .limit(1);

    let progressId;

    if (existingProgress.length > 0) {
      // Update existing progress
      await db
        .update(courseProgress)
        .set({
          ...progressData,
          watchCount: sql`${courseProgress.watchCount} + 1`,
          updatedAt: now,
        })
        .where(eq(courseProgress.id, existingProgress[0].id));
      
      progressId = existingProgress[0].id;
    } else {
      // Create new progress record
      const newProgress = await db
        .insert(courseProgress)
        .values({
          ...progressData,
          firstStartedAt: now,
          watchCount: 1,
        })
        .returning({ id: courseProgress.id });
      
      progressId = newProgress[0].id;
    }

    // Update overall enrollment progress
    const overallProgressData = await db
      .select({
        totalItems: count(),
        completedItems: sql<number>`COUNT(CASE WHEN ${courseProgress.status} = 'COMPLETED' THEN 1 END)`,
        totalTimeSpent: sql<number>`SUM(${courseProgress.timeSpentSeconds})`,
      })
      .from(courseProgress)
      .where(eq(courseProgress.enrollmentId, enrollmentId));

    const stats = overallProgressData[0];
    const overallProgress = stats.totalItems > 0 
      ? Math.round((Number(stats.completedItems) / Number(stats.totalItems)) * 100)
      : 0;

    await db
      .update(courseEnrollments)
      .set({
        overallProgress: overallProgress.toString(),
        timeSpentMinutes: Math.round(Number(stats.totalTimeSpent) / 60),
        lastAccessedAt: now,
        ...(overallProgress === 100 && { 
          status: 'COMPLETED',
          completedAt: now 
        }),
      })
      .where(eq(courseEnrollments.id, enrollmentId));

    // Track analytics event
    await db
      .insert(courseAnalytics)
      .values({
        enrollmentId,
        contentItemId,
        eventType,
        eventData: JSON.stringify({
          progressPercentage,
          timeSpentSeconds,
          lastWatchedPosition,
          status,
        }),
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        duration: timeSpentSeconds,
      });

    return NextResponse.json({
      success: true,
      data: {
        progressId,
        overallProgress,
        contentItemProgress: progressPercentage,
        status: status || 'IN_PROGRESS',
      },
      message: 'Progress updated successfully',
    });

  } catch (error) {
    console.error('Error updating course progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
