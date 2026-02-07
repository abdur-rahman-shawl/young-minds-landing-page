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

    const { data, error } = await supabase
      .from('subscription_features')
      .select(`
        *,
        subscription_feature_categories(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to flatten category
    const features = (data || []).map(feature => ({
      ...feature,
      category_name: feature.subscription_feature_categories?.name || null,
    }));

    return NextResponse.json({
      success: true,
      data: features,
    });
  } catch (error) {
    console.error('Failed to fetch features:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}
