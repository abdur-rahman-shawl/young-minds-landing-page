import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contactSubmissions } from '@/lib/db/schema';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { desc } from 'drizzle-orm';

async function ensureAdmin(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 },
        ),
      };
    }

    const userWithRoles = await getUserWithRoles(session.user.id);
    const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

    if (!isAdmin) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 },
        ),
      };
    }

    return { session };
  } catch (error) {
    console.error('Admin auth check failed:', error);
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 },
      ),
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const rows = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt));

    const data = rows.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin enquiries GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enquiries' },
      { status: 500 },
    );
  }
}
