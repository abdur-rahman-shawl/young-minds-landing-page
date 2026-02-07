import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, courses, mentors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireMentor } from '@/lib/api/guards';

const createCourseSchema = z.object({
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().min(1).optional(),
  price: z.string().optional().transform((val) => val && val !== '' ? val : undefined),
  currency: z.string().default('USD'),
  thumbnailUrl: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learningOutcomes: z.array(z.string()).min(1, 'At least one learning outcome is required'),
  // SEO fields (accepted but ignored since not in DB)
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  // Advanced settings (accepted but ignored since not in DB)
  maxStudents: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  certificateTemplate: z.string().optional(),
});

const updateCourseSchema = createCourseSchema.partial();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify content exists and belongs to mentor
    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id),
        eq(mentorContent.type, 'COURSE')
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Course content not found' }, { status: 404 });
    }

    // Check if course already exists
    const existingCourse = await db.select()
      .from(courses)
      .where(eq(courses.contentId, id))
      .limit(1);

    if (existingCourse.length) {
      return NextResponse.json({ error: 'Course already exists for this content' }, { status: 400 });
    }

    const body = await request.json();
    console.log('Course creation request body:', body);
    
    const validatedData = createCourseSchema.parse(body);
    console.log('Validated course data:', validatedData);

    // Create course (only include fields that exist in the database)
    const newCourse = await db.insert(courses)
      .values({
        contentId: id,
        difficulty: validatedData.difficulty,
        duration: validatedData.duration,
        price: validatedData.price,
        currency: validatedData.currency,
        thumbnailUrl: validatedData.thumbnailUrl,
        category: validatedData.category,
        tags: JSON.stringify(validatedData.tags || []),
        prerequisites: JSON.stringify(validatedData.prerequisites || []),
        learningOutcomes: JSON.stringify(validatedData.learningOutcomes || []),
      })
      .returning();

    return NextResponse.json(newCourse[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const session = guard.session;

    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Verify content exists and belongs to mentor
    const content = await db.select()
      .from(mentorContent)
      .where(and(
        eq(mentorContent.id, id),
        eq(mentorContent.mentorId, mentor[0].id),
        eq(mentorContent.type, 'COURSE')
      ))
      .limit(1);

    if (!content.length) {
      return NextResponse.json({ error: 'Course content not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateCourseSchema.parse(body);

    // Only include fields that exist in the database schema
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Add database fields if provided
    if (validatedData.difficulty !== undefined) updateData.difficulty = validatedData.difficulty;
    if (validatedData.duration !== undefined) updateData.duration = validatedData.duration;
    if (validatedData.price !== undefined) updateData.price = validatedData.price;
    if (validatedData.currency !== undefined) updateData.currency = validatedData.currency;
    if (validatedData.thumbnailUrl !== undefined) updateData.thumbnailUrl = validatedData.thumbnailUrl;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;

    // Convert arrays to JSON strings if provided
    if (validatedData.tags) {
      updateData.tags = JSON.stringify(validatedData.tags);
    }
    if (validatedData.prerequisites) {
      updateData.prerequisites = JSON.stringify(validatedData.prerequisites);
    }
    if (validatedData.learningOutcomes) {
      updateData.learningOutcomes = JSON.stringify(validatedData.learningOutcomes);
    }

    const updatedCourse = await db.update(courses)
      .set(updateData)
      .where(eq(courses.contentId, id))
      .returning();

    if (!updatedCourse.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCourse[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
