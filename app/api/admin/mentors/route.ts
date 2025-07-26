import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin role
    const userWithRoles = await getUserWithRoles(session.user.id);
    const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const list = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        title: mentors.title,
        company: mentors.company,
        verificationStatus: mentors.verificationStatus,
        name: users.name,
        email: users.email,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id));

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Admin mentors GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin role
    const userWithRoles = await getUserWithRoles(session.user.id);
    const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { mentorId, status } = body;
    if (!mentorId || !status) {
      return NextResponse.json({ success: false, error: 'mentorId and status required' }, { status: 400 });
    }
    if (!['YET_TO_APPLY','IN_PROGRESS','VERIFIED','REJECTED','REVERIFICATION'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }
    const [updated] = await db
      .update(mentors)
      .set({ verificationStatus: status })
      .where(eq(mentors.id, mentorId))
      .returning();
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Admin mentors PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
} 