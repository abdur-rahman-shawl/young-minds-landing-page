import { NextRequest, NextResponse } from 'next/server';
import { enforceFeature, isSubscriptionPolicyError } from '@/lib/subscriptions/policy-runtime';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [freeAccess, paidAccess, mentorSessionsAccess] = await Promise.all([
      enforceFeature({ action: 'mentor.free_session_availability', userId: id }).catch((error) => {
        if (isSubscriptionPolicyError(error)) return null;
        throw error;
      }),
      enforceFeature({ action: 'mentor.paid_session_availability', userId: id }).catch((error) => {
        if (isSubscriptionPolicyError(error)) return null;
        throw error;
      }),
      enforceFeature({ action: 'booking.mentor.session', userId: id }).catch((error) => {
        if (isSubscriptionPolicyError(error)) return null;
        throw error;
      }),
    ]);

    const mentorSessionsAvailable = Boolean(mentorSessionsAccess?.has_access);

    return NextResponse.json({
      success: true,
      data: {
        free_available: Boolean(freeAccess?.has_access) && mentorSessionsAvailable,
        free_remaining: freeAccess?.remaining ?? null,
        paid_available: Boolean(paidAccess?.has_access) && mentorSessionsAvailable,
        paid_remaining: paidAccess?.remaining ?? null,
        mentor_sessions_available: mentorSessionsAvailable,
      },
    });
  } catch (error) {
    console.error('Failed to load booking eligibility:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load booking eligibility' },
      { status: 500 }
    );
  }
}
