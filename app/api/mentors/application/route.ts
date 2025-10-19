import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const [mentor] = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor) {
      return NextResponse.json({ success: false, error: 'Mentor application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mentor });
  } catch (error) {
    console.error('Error fetching mentor application:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch mentor application' }, { status: 500 });
  }
}
