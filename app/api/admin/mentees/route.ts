import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentees, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';

const menteeSelectFields = {
  id: mentees.id,
  userId: mentees.userId,
  name: users.name,
  email: users.email,
  image: users.image,
  currentRole: mentees.currentRole,
  currentCompany: mentees.currentCompany,
  education: mentees.education,
  careerGoals: mentees.careerGoals,
  interests: mentees.interests,
  skillsToLearn: mentees.skillsToLearn,
  currentSkills: mentees.currentSkills,
  learningStyle: mentees.learningStyle,
  preferredMeetingFrequency: mentees.preferredMeetingFrequency,
  createdAt: mentees.createdAt,
  updatedAt: mentees.updatedAt,
};

const parseJsonList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            if ('label' in item && typeof item.label === 'string') return item.label;
            if ('name' in item && typeof item.name === 'string') return item.name;
            return Object.values(item)
              .filter((val) => typeof val === 'string')
              .join(' ');
          }
          return String(item ?? '').trim();
        })
        .filter(Boolean);
    }
  } catch (error) {
    // fallback handled below
  }
  if (value.includes(',')) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value ? [value] : [];
};

async function fetchMenteeRows() {
  return db
    .select(menteeSelectFields)
    .from(mentees)
    .innerJoin(users, eq(mentees.userId, users.id));
}

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

    const rows = await fetchMenteeRows();
    const data = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      image: row.image,
      currentRole: row.currentRole,
      currentCompany: row.currentCompany,
      careerGoals: row.careerGoals,
      interests: parseJsonList(row.interests),
      skillsToLearn: parseJsonList(row.skillsToLearn),
      currentSkills: parseJsonList(row.currentSkills),
      education: parseJsonList(row.education),
      learningStyle: row.learningStyle,
      preferredMeetingFrequency: row.preferredMeetingFrequency,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin mentees GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch mentees' }, { status: 500 });
  }
}
