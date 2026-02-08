import { NextRequest, NextResponse } from 'next/server';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [freeAccess, paidAccess] = await Promise.all([
      checkFeatureAccess(id, FEATURE_KEYS.FREE_VIDEO_SESSIONS_MONTHLY).catch(() => null),
      checkFeatureAccess(id, FEATURE_KEYS.PAID_VIDEO_SESSIONS_MONTHLY).catch(() => null),
    ]);

    const hasFreeRemaining = freeAccess?.has_access && (typeof freeAccess.remaining !== 'number' || freeAccess.remaining > 0);
    const hasPaidRemaining = paidAccess?.has_access && (typeof paidAccess.remaining !== 'number' || paidAccess.remaining > 0);

    const mentorSessionsAvailable = hasFreeRemaining || hasPaidRemaining;
    const remainingValues = [
      typeof freeAccess?.remaining === 'number' ? freeAccess.remaining : null,
      typeof paidAccess?.remaining === 'number' ? paidAccess.remaining : null,
    ].filter((value): value is number => value !== null);
    const mentorSessionsRemaining = remainingValues.length > 0 ? Math.max(...remainingValues) : null;

    return NextResponse.json({
      success: true,
      data: {
        free_available: freeAccess?.has_access ?? false,
        free_remaining: freeAccess?.remaining ?? null,
        paid_available: paidAccess?.has_access ?? false,
        paid_remaining: paidAccess?.remaining ?? null,
        mentor_sessions_available: mentorSessionsAvailable,
        mentor_sessions_remaining: mentorSessionsRemaining,
        mentor_sessions_limit: paidAccess?.limit ?? null,
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
