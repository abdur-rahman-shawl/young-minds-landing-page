import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  courses, 
  mentorContent, 
  courseCategories,
  courseCategoryRelations,
  courseEnrollments,
  courseReviews,
  mentors,
  users
} from '@/lib/db/schema';
import { eq, and, or, like, desc, asc, sql, count, avg } from 'drizzle-orm';

// GET /api/courses - Get courses with filtering, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const featured = searchParams.get('featured') === 'true';
    const mentorId = searchParams.get('mentorId') || '';

    const offset = (page - 1) * limit;

    // Build the base query with joins
    let query = db
      .select({
        id: courses.id,
        title: mentorContent.title,
        description: mentorContent.description,
        difficulty: courses.difficulty,
        duration: courses.duration,
        price: courses.price,
        currency: courses.currency,
        thumbnailUrl: courses.thumbnailUrl,
        category: courses.category,
        tags: courses.tags,
        prerequisites: courses.prerequisites,
        learningOutcomes: courses.learningOutcomes,
        enrollmentCount: courses.enrollmentCount,
        status: mentorContent.status,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        // Mentor info
        mentor: {
          id: mentors.id,
          userId: mentors.userId,
          name: users.name,
          image: users.image,
          title: mentors.title,
          company: mentors.company,
        },
        // Statistics (calculated separately)
        avgRating: sql<number>`COALESCE(AVG(CAST(${courseReviews.rating} AS DECIMAL)), 0)`,
        reviewCount: sql<number>`COUNT(${courseReviews.id})`,
      })
      .from(courses)
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .innerJoin(mentors, eq(mentorContent.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .leftJoin(courseReviews, and(
        eq(courseReviews.courseId, courses.id),
        eq(courseReviews.isPublished, true)
      ))
      .where(eq(mentorContent.status, 'PUBLISHED'))
      .groupBy(
        courses.id,
        mentorContent.id,
        mentors.id,
        users.id
      );

    // Apply filters
    const conditions = [];

    // Search filter
    if (search) {
      conditions.push(
        or(
          like(mentorContent.title, `%${search}%`),
          like(mentorContent.description, `%${search}%`),
          like(courses.tags, `%${search}%`)
        )
      );
    }

    // Category filter
    if (category) {
      conditions.push(eq(courses.category, category));
    }

    // Difficulty filter
    if (difficulty) {
      conditions.push(eq(courses.difficulty, difficulty as any));
    }

    // Price range filter
    if (minPrice !== undefined) {
      conditions.push(sql`CAST(${courses.price} AS DECIMAL) >= ${minPrice}`);
    }
    if (maxPrice !== undefined) {
      conditions.push(sql`CAST(${courses.price} AS DECIMAL) <= ${maxPrice}`);
    }

    // Mentor filter
    if (mentorId) {
      conditions.push(eq(mentorContent.mentorId, mentorId));
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderColumn = sortBy === 'price' ? courses.price :
                       sortBy === 'rating' ? sql`AVG(CAST(${courseReviews.rating} AS DECIMAL))` :
                       sortBy === 'enrollment_count' ? courses.enrollmentCount :
                       sortBy === 'created_at' ? courses.createdAt :
                       courses.createdAt;

    query = query.orderBy(
      sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn)
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Execute query
    const rawCoursesData = await query;
    
    // Process the data to parse JSON fields
    const coursesData = rawCoursesData.map(course => ({
      ...course,
      tags: course.tags ? JSON.parse(course.tags) : [],
      prerequisites: course.prerequisites ? JSON.parse(course.prerequisites) : [],
      learningOutcomes: course.learningOutcomes ? JSON.parse(course.learningOutcomes) : [],
    }));

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(courses)
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .where(
        conditions.length > 0 
          ? and(eq(mentorContent.status, 'PUBLISHED'), ...conditions)
          : eq(mentorContent.status, 'PUBLISHED')
      );

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get categories for filters
    const categoriesData = await db
      .select({
        id: courseCategories.id,
        name: courseCategories.name,
        slug: courseCategories.slug,
        color: courseCategories.color,
        courseCount: count(courseCategoryRelations.courseId),
      })
      .from(courseCategories)
      .leftJoin(courseCategoryRelations, eq(courseCategories.id, courseCategoryRelations.categoryId))
      .where(eq(courseCategories.isActive, true))
      .groupBy(courseCategories.id)
      .orderBy(asc(courseCategories.orderIndex));

    return NextResponse.json({
      success: true,
      data: {
        courses: coursesData,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          categories: categoriesData,
          difficulties: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        },
      },
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}