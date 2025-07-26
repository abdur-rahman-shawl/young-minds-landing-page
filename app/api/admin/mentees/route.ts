import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentees, users } from '@/lib/db/schema';
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
        id: mentees.id,
        userId: mentees.userId,
        currentRole: mentees.currentRole,
        education: mentees.education,
        careerGoals: mentees.careerGoals,
        currentSkills: mentees.currentSkills,
        skillsToLearn: mentees.skillsToLearn,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(mentees)
      .innerJoin(users, eq(mentees.userId, users.id));

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Admin mentees GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
} 