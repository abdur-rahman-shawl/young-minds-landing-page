import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/guards';
import {
  createPlan,
  findPlanByKey,
  listPlansWithCounts,
} from '@/lib/db/queries/subscriptions';

const createPlanSchema = z.object({
  plan_key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Plan key must be lowercase with underscores'),
  audience: z.enum(['mentor', 'mentee']),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'active']),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const plans = await listPlansWithCounts();

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
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const body = await request.json();
    const validatedData = createPlanSchema.parse(body);

    if (await findPlanByKey(validatedData.plan_key)) {
      return NextResponse.json(
        { success: false, message: 'Plan key already exists' },
        { status: 400 }
      );
    }

    const data = await createPlan(validatedData);

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
