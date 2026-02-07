import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { z } from 'zod';
import { sendMentorApplicationApprovedEmail, sendMentorApplicationRejectedEmail, sendMentorApplicationReverificationRequestEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/db/audit';
import { resolveStorageUrl } from '@/lib/storage';

const VERIFICATION_STATUSES = [
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'VERIFIED',
  'REJECTED',
  'REVERIFICATION',
  'RESUBMITTED',
] as const;

type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

const mentorSelectFields = {
  id: mentors.id,
  userId: mentors.userId,
  name: mentors.fullName,
  email: mentors.email,
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
  profileImageUrl: mentors.profileImageUrl,
  phone: mentors.phone,
  githubUrl: mentors.githubUrl,
  fullName: mentors.fullName,
  country: mentors.country,
  state: mentors.state,
  city: mentors.city,
  createdAt: mentors.createdAt,
  updatedAt: mentors.updatedAt,
  couponCode: mentors.couponCode,
  isCouponCodeEnabled: mentors.isCouponCodeEnabled,
  paymentStatus: mentors.paymentStatus,
};

const COUPON_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCouponCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * COUPON_CHARSET.length);
    code += COUPON_CHARSET[index];
  }
  return code;
}

const updateMentorSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
  status: z.enum(VERIFICATION_STATUSES),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional(),
  enableCoupon: z.boolean().optional(),
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

const formatMentorRecord = async (raw: Awaited<ReturnType<typeof fetchMentorRows>>[number]) => {
  const signedProfileImageUrl = await resolveStorageUrl(raw.profileImageUrl);
  const signedResumeUrl = await resolveStorageUrl(raw.resumeUrl);
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
    resumeUrl: signedResumeUrl,
    linkedinUrl: raw.linkedinUrl,
    websiteUrl: raw.websiteUrl,
    profileImageUrl: signedProfileImageUrl,
    phone: raw.phone,
    githubUrl: raw.githubUrl,
    fullName: raw.fullName,
    location: [raw.city, raw.state, raw.country].filter(Boolean).join(', '),
    city: raw.city,
    state: raw.state,
    country: raw.country,
    createdAt: raw.createdAt ? raw.createdAt.toISOString() : null,
    updatedAt: raw.updatedAt ? raw.updatedAt.toISOString() : null,
    couponCode: raw.couponCode,
    isCouponCodeEnabled: raw.isCouponCodeEnabled,
    paymentStatus: raw.paymentStatus,
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

export async function ensureAdmin(request: NextRequest) {
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
    const data = await Promise.all(rows.map(formatMentorRecord));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin mentors GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch mentors' }, { status: 500 });
  }
}

async function sendNotification(userId: string, type: string, title: string, message: string, actionUrl?: string) {
  console.log(`🚀 Sending notification to user ${userId}...`);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  try {
    const response = await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type, title, message, actionUrl }),
    });
    if (response.ok) {
      console.log(`✅ Notification sent successfully to user ${userId}`);
    } else {
      console.error(`❌ Failed to send notification to user ${userId}:`, await response.json());
    }
  } catch (error) {
    console.error(`❌ Error sending notification to user ${userId}:`, error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminId = adminCheck.session.user.id;

    const payload = await request.json();
    const parsed = updateMentorSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { mentorId, status, notes, enableCoupon } = parsed.data;
    const noteToStore = notes && notes.length > 0 ? notes : null;
    const shouldEnableCoupon = status === 'VERIFIED' && Boolean(enableCoupon);
    const couponCode = shouldEnableCoupon ? generateCouponCode() : null;

    const updateData: Record<string, any> = {
      verificationStatus: status,
      verificationNotes: noteToStore,
      updatedAt: new Date(),
      isCouponCodeEnabled: shouldEnableCoupon,
    };

    updateData.couponCode = couponCode;

    const [updatedMentor] = await db
      .update(mentors)
      .set(updateData)
      .where(eq(mentors.id, mentorId))
      .returning({ id: mentors.id, userId: mentors.userId, fullName: mentors.fullName, email: mentors.email });

    if (!updatedMentor) {
      return NextResponse.json({ success: false, error: 'Mentor not found' }, { status: 404 });
    }

    await logAdminAction({
      adminId,
      action: 'MENTOR_VERIFICATION_STATUS_CHANGED',
      targetId: updatedMentor.userId,
      targetType: 'mentor',
      details: { newStatus: status, notes, couponIssued: couponCode ?? undefined },
    });

    const { userId, fullName, email } = updatedMentor;

    if (status === 'VERIFIED') {
      await sendMentorApplicationApprovedEmail(email!, fullName!, couponCode ?? undefined);
      await sendNotification(
        userId,
        'MENTOR_APPLICATION_APPROVED',
        'Application Approved!',
        'Congratulations! Your mentor application has been approved.',
        '/dashboard'
      );
    } else if (status === 'REJECTED') {
      await sendMentorApplicationRejectedEmail(email!, fullName!, noteToStore || 'No reason provided.');
      await sendNotification(
        userId,
        'MENTOR_APPLICATION_REJECTED',
        'Application Rejected',
        `Your mentor application has been rejected. Reason: ${notes || 'No reason provided.'}`,
        '/become-expert'
      );
    } else if (status === 'REVERIFICATION') {
      await sendMentorApplicationReverificationRequestEmail(email!, fullName!, noteToStore || 'No reason provided.');
      await sendNotification(
        userId,
        'MENTOR_APPLICATION_UPDATE_REQUESTED',
        'Update Requested',
        `An update has been requested for your mentor application. Note: ${notes || 'No reason provided.'}`,
        '/become-expert'
      );
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
