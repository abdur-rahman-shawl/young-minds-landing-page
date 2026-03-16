import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorContent, mentors, users } from '@/lib/db/schema';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
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

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mentorId = searchParams.get('mentorId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(mentorContent.status, status as any));
    }
    if (mentorId) {
      conditions.push(eq(mentorContent.mentorId, mentorId));
    }
    if (type) {
      conditions.push(eq(mentorContent.type, type as any));
    }
    if (search) {
      conditions.push(
        or(
          ilike(mentorContent.title, `%${search}%`),
          ilike(mentorContent.description, `%${search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mentorContent)
      .where(whereClause);

    const totalCount = Number(countResult.count);

    // Get content with mentor info
    const contentList = await db
      .select({
        content: mentorContent,
        mentorName: users.name,
        mentorEmail: users.email,
        mentorImage: users.image,
      })
      .from(mentorContent)
      .innerJoin(mentors, eq(mentorContent.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(whereClause)
      .orderBy(desc(mentorContent.submittedForReviewAt), desc(mentorContent.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: contentList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Admin content list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
