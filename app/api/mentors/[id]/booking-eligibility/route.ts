import { NextRequest, NextResponse } from 'next/server';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [freeAccess, paidAccess, mentorAccess] = await Promise.all([
      checkFeatureAccess(id, FEATURE_KEYS.FREE_VIDEO_SESSIONS_MONTHLY).catch(() => null),
      checkFeatureAccess(id, FEATURE_KEYS.PAID_VIDEO_SESSIONS_MONTHLY).catch(() => null),
      checkFeatureAccess(id, FEATURE_KEYS.MENTOR_SESSIONS_MONTHLY).catch(() => null),
    ]);

    const mentorSessionsAvailable = mentorAccess?.has_access ?? false;

    return NextResponse.json({
      success: true,
      data: {
        free_available: freeAccess?.has_access ?? false,
        free_remaining: freeAccess?.remaining ?? null,
        paid_available: paidAccess?.has_access ?? false,
        paid_remaining: paidAccess?.remaining ?? null,
        mentor_sessions_available: mentorSessionsAvailable,
        mentor_sessions_remaining: mentorAccess?.remaining ?? null,
        mentor_sessions_limit: mentorAccess?.limit ?? null,
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
