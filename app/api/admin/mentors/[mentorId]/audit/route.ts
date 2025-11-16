
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentorsProfileAudit } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
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

export async function GET(request: NextRequest, { params }: { params: { mentorId: string } }) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { mentorId } = params;

    if (!mentorId) {
      return NextResponse.json({ success: false, error: 'Mentor ID is required' }, { status: 400 });
    }

    const [latestAudit] = await db
      .select()
      .from(mentorsProfileAudit)
      .where(eq(mentorsProfileAudit.mentorId, mentorId))
      .orderBy(desc(mentorsProfileAudit.changedAt))
      .limit(1);

    if (!latestAudit) {
      return NextResponse.json({ success: false, error: 'No audit history found for this mentor' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: latestAudit });
  } catch (error) {
    console.error('Admin mentor audit GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch mentor audit history' }, { status: 500 });
  }
}
