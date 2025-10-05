import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { z } from 'zod';

const VERIFICATION_STATUSES = [
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'VERIFIED',
  'REJECTED',
  'REVERIFICATION',
] as const;

type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

const mentorSelectFields = {
  id: mentors.id,
  userId: mentors.userId,
  name: users.name,
  email: users.email,
  image: users.image,
  title: mentors.title,
  company: mentors.company,
  industry: mentors.industry,
  headline: mentors.headline,
  about: mentors.about,
  experienceYears: mentors.experience,
  expertise: mentors.expertise,
  hourlyRate: mentors.hourlyRate,
  currency: mentors.currency,
  verificationStatus: mentors.verificationStatus,
  verificationNotes: mentors.verificationNotes,
  isAvailable: mentors.isAvailable,
  resumeUrl: mentors.resumeUrl,
  linkedinUrl: mentors.linkedinUrl,
  websiteUrl: mentors.websiteUrl,
  fullName: mentors.fullName,
  country: mentors.country,
  state: mentors.state,
  city: mentors.city,
  createdAt: mentors.createdAt,
  updatedAt: mentors.updatedAt,
};

const updateMentorSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
  status: z.enum(VERIFICATION_STATUSES),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional(),
});

const parseJsonList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .filter(Boolean);
    }
  } catch (error) {
    // fall through to comma split
  }
  if (typeof value === 'string' && value.includes(',')) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value ? [value] : [];
};

const formatMentorRecord = (raw: Awaited<ReturnType<typeof fetchMentorRows>>[number]) => {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    email: raw.email,
    image: raw.image,
    title: raw.title,
    company: raw.company,
    industry: raw.industry,
    headline: raw.headline,
    about: raw.about,
    experienceYears: raw.experienceYears,
    expertise: parseJsonList(raw.expertise),
    hourlyRate: raw.hourlyRate,
    currency: raw.currency,
    verificationStatus: raw.verificationStatus,
    verificationNotes: raw.verificationNotes,
    isAvailable: raw.isAvailable,
    resumeUrl: raw.resumeUrl,
    linkedinUrl: raw.linkedinUrl,
    websiteUrl: raw.websiteUrl,
    fullName: raw.fullName,
    location: [raw.city, raw.state, raw.country].filter(Boolean).join(', '),
    city: raw.city,
    state: raw.state,
    country: raw.country,
    createdAt: raw.createdAt ? raw.createdAt.toISOString() : null,
    updatedAt: raw.updatedAt ? raw.updatedAt.toISOString() : null,
  };
};

async function fetchMentorRows(mentorId?: string) {
  let query = db
    .select(mentorSelectFields)
    .from(mentors)
    .innerJoin(users, eq(mentors.userId, users.id));

  if (mentorId) {
    query = query.where(eq(mentors.id, mentorId));
  }

  return await query;
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

    const rows = await fetchMentorRows();
    const data = rows.map(formatMentorRecord);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin mentors GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch mentors' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const payload = await request.json();
    const parsed = updateMentorSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { mentorId, status, notes } = parsed.data;
    const noteToStore = notes && notes.length > 0 ? notes : null;

    const [updatedMentor] = await db
      .update(mentors)
      .set({
        verificationStatus: status,
        verificationNotes: noteToStore,
        updatedAt: new Date(),
      })
      .where(eq(mentors.id, mentorId))
      .returning({ id: mentors.id });

    if (!updatedMentor) {
      return NextResponse.json({ success: false, error: 'Mentor not found' }, { status: 404 });
    }

    const refreshedRows = await fetchMentorRows(mentorId);
    const refreshed = refreshedRows.map(formatMentorRecord);
    const mentor = refreshed[0];

    return NextResponse.json({ success: true, data: mentor });
  } catch (error) {
    console.error('Admin mentors PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update mentor' }, { status: 500 });
  }
}

