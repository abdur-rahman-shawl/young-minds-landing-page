import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/guards';

const createFeatureSchema = z.object({
  feature_key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Feature key must be lowercase snake_case'),
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  value_type: z.enum(['boolean', 'count', 'minutes', 'text', 'amount', 'percent', 'json']),
  unit: z.string().trim().nullable().optional(),
  is_metered: z.boolean(),
});

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
    const features = (data || []).map(feature => {
      const category = Array.isArray(feature.subscription_feature_categories)
        ? feature.subscription_feature_categories[0]
        : feature.subscription_feature_categories;

      return {
        ...feature,
        category_name: category?.name || null,
      };
    });

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

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const body = await request.json();
    const payload = createFeatureSchema.parse(body);
    const supabase = await createClient();

    const { data: existingFeature, error: existingFeatureError } = await supabase
      .from('subscription_features')
      .select('id')
      .eq('feature_key', payload.feature_key)
      .limit(1);

    if (existingFeatureError) {
      throw existingFeatureError;
    }

    if ((existingFeature || []).length > 0) {
      return NextResponse.json(
        { success: false, message: `Feature key '${payload.feature_key}' already exists` },
        { status: 409 }
      );
    }

    const normalizedDescription = payload.description?.trim() || null;
    const normalizedUnit = payload.unit?.trim() || null;

    const { data, error } = await supabase
      .from('subscription_features')
      .insert({
        feature_key: payload.feature_key,
        name: payload.name,
        description: normalizedDescription,
        category_id: payload.category_id || null,
        value_type: payload.value_type,
        unit: normalizedUnit,
        is_metered: payload.is_metered,
        metadata: {},
      })
      .select(`
        *,
        subscription_feature_categories(name)
      `)
      .single();

    if (error) {
      throw error;
    }

    const category = Array.isArray(data.subscription_feature_categories)
      ? data.subscription_feature_categories[0]
      : data.subscription_feature_categories;

    const feature = {
      ...data,
      category_name: category?.name || null,
    };

    return NextResponse.json({ success: true, data: feature }, { status: 201 });
  } catch (error) {
    console.error('Failed to create feature:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to create feature' },
      { status: 500 }
    );
  }
}
