import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const supabase = await createClient();

    // Get total plans
    const { count: totalPlans } = await supabase
      .from('subscription_plans')
      .select('*', { count: 'exact', head: true });

    // Get active plans
    const { count: activePlans } = await supabase
      .from('subscription_plans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total features
    const { count: totalFeatures } = await supabase
      .from('subscription_features')
      .select('*', { count: 'exact', head: true });

    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['trialing', 'active']);

    return NextResponse.json({
      success: true,
      data: {
        totalPlans: totalPlans || 0,
        activePlans: activePlans || 0,
        totalFeatures: totalFeatures || 0,
        activeSubscriptions: activeSubscriptions || 0,
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
