import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mentors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  couponCode: z.string().trim().min(1, 'Coupon code is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsedBody = bodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon code', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const inputCode = parsedBody.data.couponCode.trim().toUpperCase();

    const [mentor] = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        couponCode: mentors.couponCode,
        paymentStatus: mentors.paymentStatus,
        isCouponCodeEnabled: mentors.isCouponCodeEnabled,
      })
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor) {
      return NextResponse.json(
        { success: false, error: 'Mentor profile not found' },
        { status: 404 }
      );
    }

    if (mentor.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Payment is already completed' },
        { status: 400 }
      );
    }

    if (!mentor.couponCode) {
      return NextResponse.json(
        { success: false, error: 'No coupon code assigned to this account' },
        { status: 400 }
      );
    }

    if (!mentor.isCouponCodeEnabled) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is not active for this account' },
        { status: 400 }
      );
    }

    if (mentor.couponCode.toUpperCase() !== inputCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon code' },
        { status: 400 }
      );
    }

    await db
      .update(mentors)
      .set({
        paymentStatus: 'COMPLETED',
        couponCode: null,
        updatedAt: new Date(),
      })
      .where(eq(mentors.id, mentor.id));

    return NextResponse.json({ success: true, message: 'Coupon applied successfully' });
  } catch (error) {
    console.error('Mentor coupon validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon code' },
      { status: 500 }
    );
  }
}
