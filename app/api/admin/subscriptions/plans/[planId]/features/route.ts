import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const upsertFeatureSchema = z.object({
  feature_id: z.string().uuid(),
  is_included: z.boolean().optional(),
  limit_count: z.number().int().nullable().optional(),
  limit_minutes: z.number().int().nullable().optional(),
  limit_text: z.string().nullable().optional(),
  limit_amount: z.number().nullable().optional(),
  limit_currency: z.string().nullable().optional(),
  limit_percent: z.number().nullable().optional(),
  limit_json: z.record(z.any()).nullable().optional(),
  limit_interval: z.enum(['day', 'week', 'month', 'year']).nullable().optional(),
  limit_interval_count: z.number().int().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subscription_features')
      .select(`
        id,
        feature_key,
        name,
        description,
        value_type,
        unit,
        is_metered,
        subscription_feature_categories(name, icon),
        subscription_plan_features!left(
          id,
          plan_id,
          is_included,
          limit_count,
          limit_minutes,
          limit_text,
          limit_amount,
          limit_currency,
          limit_percent,
          limit_json,
          limit_interval,
          limit_interval_count
        )
      `)
      .or(`plan_id.is.null,plan_id.eq.${planId}`, {
        foreignTable: 'subscription_plan_features',
      })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Failed to load plan features:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load plan features' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const payload = upsertFeatureSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subscription_plan_features')
      .upsert({
        plan_id: planId,
        feature_id: payload.feature_id,
        is_included: payload.is_included ?? false,
        limit_count: payload.limit_count ?? null,
        limit_minutes: payload.limit_minutes ?? null,
        limit_text: payload.limit_text ?? null,
        limit_amount: payload.limit_amount ?? null,
        limit_currency: payload.limit_currency ?? null,
        limit_percent: payload.limit_percent ?? null,
        limit_json: payload.limit_json ?? null,
        limit_interval: payload.limit_interval ?? null,
        limit_interval_count: payload.limit_interval_count ?? null,
      }, { onConflict: 'plan_id,feature_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to save plan feature:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to save plan feature' },
      { status: 500 }
    );
  }
}
