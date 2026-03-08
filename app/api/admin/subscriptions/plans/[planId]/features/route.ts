import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/guards';
import {
  listPlanFeaturesForEditor,
  upsertPlanFeature,
} from '@/lib/db/queries/subscriptions';

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
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const { planId } = await params;
    const data = await listPlanFeaturesForEditor(planId);

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
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const { planId } = await params;
    const body = await request.json();
    const payload = upsertFeatureSchema.parse(body);

    const data = await upsertPlanFeature(planId, payload);

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
