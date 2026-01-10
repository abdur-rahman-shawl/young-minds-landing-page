import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createPlanSchema = z.object({
  plan_key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Plan key must be lowercase with underscores'),
  audience: z.enum(['mentor', 'mentee']),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'active']),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subscription_plans')
      .select(`
        *,
        feature_count:subscription_plan_features(count),
        price_count:subscription_plan_prices(count)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the counts
    const plans = (data || []).map(plan => ({
      ...plan,
      feature_count: plan.feature_count?.[0]?.count || 0,
      price_count: plan.price_count?.[0]?.count || 0,
    }));

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPlanSchema.parse(body);

    const supabase = await createClient();

    // Check if plan_key already exists
    const { data: existing } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('plan_key', validatedData.plan_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Plan key already exists' },
        { status: 400 }
      );
    }

    // Get max sort_order for the audience
    const { data: maxSortOrder } = await supabase
      .from('subscription_plans')
      .select('sort_order')
      .eq('audience', validatedData.audience)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (maxSortOrder?.sort_order || 0) + 1;

    // Create plan
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        ...validatedData,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to create plan:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to create plan' },
      { status: 500 }
    );
  }
}
