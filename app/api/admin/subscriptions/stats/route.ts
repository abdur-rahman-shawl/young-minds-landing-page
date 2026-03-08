import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guards';
import { getSubscriptionStats } from '@/lib/db/queries/subscriptions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const data = await getSubscriptionStats();

    return NextResponse.json({
      success: true,
      data: {
        totalPlans: data.total_plans || 0,
        activePlans: data.active_plans || 0,
        totalFeatures: data.total_features || 0,
        activeSubscriptions: data.active_subscriptions || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch subscription stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription stats' },
      { status: 500 }
    );
  }
}
