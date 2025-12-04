import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mentors } from '@/lib/db/schema';
import { ensureAdmin, generateCouponCode } from '../route';
import { sendMentorApplicationApprovedEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/db/audit';

const sendCouponSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor identifier'),
});

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminId = adminCheck.session.user.id;

    const payload = await request.json();
    const parsed = sendCouponSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { mentorId } = parsed.data;
    const [mentor] = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        fullName: mentors.fullName,
        email: mentors.email,
        verificationStatus: mentors.verificationStatus,
        paymentStatus: mentors.paymentStatus,
      })
      .from(mentors)
      .where(eq(mentors.id, mentorId))
      .limit(1);

    if (!mentor) {
      return NextResponse.json(
        { success: false, error: 'Mentor not found' },
        { status: 404 },
      );
    }

    if (mentor.verificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        { success: false, error: 'Coupon codes can only be sent to verified mentors' },
        { status: 400 },
      );
    }

    if (mentor.paymentStatus && mentor.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Coupon codes are only available for mentors with pending payments' },
        { status: 400 },
      );
    }

    if (!mentor.email) {
      return NextResponse.json(
        { success: false, error: 'Mentor email is missing' },
        { status: 422 },
      );
    }

    const couponCode = generateCouponCode();

    await db
      .update(mentors)
      .set({
        couponCode,
        isCouponCodeEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(mentors.id, mentorId));

    await sendMentorApplicationApprovedEmail(
      mentor.email,
      mentor.fullName ?? 'Mentor',
      couponCode,
    );

    await logAdminAction({
      adminId,
      action: 'MENTOR_COUPON_SENT',
      targetId: mentor.userId,
      targetType: 'mentor',
      details: { couponIssued: couponCode },
    });

    return NextResponse.json({ success: true, couponCode });
  } catch (error) {
    console.error('Admin mentor coupon POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send coupon code' },
      { status: 500 },
    );
  }
}
