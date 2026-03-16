import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, mentors, mentorProfileContent } from '@/lib/db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { requireMentor } from '@/lib/api/guards';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
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

    // Get profile content selections with content details
    const selections = await db
      .select({
        selection: mentorProfileContent,
        content: mentorContent,
      })
      .from(mentorProfileContent)
      .innerJoin(mentorContent, eq(mentorProfileContent.contentId, mentorContent.id))
      .where(eq(mentorProfileContent.mentorId, mentor[0].id))
      .orderBy(asc(mentorProfileContent.displayOrder));

    return NextResponse.json({
      success: true,
      data: selections.map((s: { selection: any; content: any }) => ({
        ...s.content,
        displayOrder: s.selection.displayOrder,
        addedAt: s.selection.addedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching profile content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateProfileContentSchema = z.object({
  contentIds: z.array(z.string().uuid()).min(0),
});

export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { contentIds } = updateProfileContentSchema.parse(body);

    // Validate all content IDs belong to the mentor and are APPROVED
    if (contentIds.length > 0) {
      const validContent = await db.select({ id: mentorContent.id })
        .from(mentorContent)
        .where(and(
          eq(mentorContent.mentorId, mentor[0].id),
          eq(mentorContent.status, 'APPROVED'),
          inArray(mentorContent.id, contentIds)
        ));

      const validIds = new Set(validContent.map((c: { id: string }) => c.id));
      const invalidIds = contentIds.filter(id => !validIds.has(id));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'Some content IDs are invalid or not approved', invalidIds },
          { status: 400 }
        );
      }
    }

    // Replace all profile content selections (transaction: delete all, then insert)
    await db.delete(mentorProfileContent)
      .where(eq(mentorProfileContent.mentorId, mentor[0].id));

    if (contentIds.length > 0) {
      await db.insert(mentorProfileContent).values(
        contentIds.map((contentId, index) => ({
          mentorId: mentor[0].id,
          contentId,
          displayOrder: index,
        }))
      );
    }

    // Return updated selections
    const updatedSelections = await db
      .select({
        selection: mentorProfileContent,
        content: mentorContent,
      })
      .from(mentorProfileContent)
      .innerJoin(mentorContent, eq(mentorProfileContent.contentId, mentorContent.id))
      .where(eq(mentorProfileContent.mentorId, mentor[0].id))
      .orderBy(asc(mentorProfileContent.displayOrder));

    return NextResponse.json({
      success: true,
      data: updatedSelections.map((s: { selection: any; content: any }) => ({
        ...s.content,
        displayOrder: s.selection.displayOrder,
        addedAt: s.selection.addedAt,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating profile content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
