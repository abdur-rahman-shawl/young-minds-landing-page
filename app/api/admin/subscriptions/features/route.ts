import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/guards';
import {
  createFeature,
  featureKeyExists,
  listFeatures,
} from '@/lib/db/queries/subscriptions';

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

    const features = await listFeatures();

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
    if (await featureKeyExists(payload.feature_key)) {
      return NextResponse.json(
        { success: false, message: `Feature key '${payload.feature_key}' already exists` },
        { status: 409 }
      );
    }

    const normalizedDescription = payload.description?.trim() || null;
    const normalizedUnit = payload.unit?.trim() || null;

    const feature = await createFeature({
      feature_key: payload.feature_key,
      name: payload.name,
      description: normalizedDescription,
      category_id: payload.category_id || null,
      value_type: payload.value_type,
      unit: normalizedUnit,
      is_metered: payload.is_metered,
    });

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
