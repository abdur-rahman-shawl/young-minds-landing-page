import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess } from '@/lib/subscriptions/enforcement';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const featureKeyParam = new URL(req.url).searchParams.get('featureKey');
    if (!featureKeyParam) {
      return NextResponse.json(
        { success: false, error: 'featureKey query parameter is required' },
        { status: 400 }
      );
    }

    if (featureKeyParam !== FEATURE_KEYS.PRIORITY_MESSAGING) {
      return NextResponse.json(
        { success: false, error: 'Unsupported feature key' },
        { status: 400 }
      );
    }

    const access = await checkFeatureAccess(session.user.id, FEATURE_KEYS.PRIORITY_MESSAGING);
    return NextResponse.json({
      success: true,
      data: {
        hasAccess: access.has_access,
        remaining: access.remaining ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to check feature access:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check feature access' },
      { status: 500 }
    );
  }
}
