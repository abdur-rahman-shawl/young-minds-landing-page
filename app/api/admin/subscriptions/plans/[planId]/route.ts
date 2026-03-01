import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/guards';
import { deletePlan, updatePlan } from '@/lib/db/queries/subscriptions';

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function PATCH(
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
    const updates = updatePlanSchema.parse(body);

    const data = await updatePlan(planId, updates);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update plan:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to update plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const { planId } = await params;
    await deletePlan(planId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete plan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete plan' },
      { status: 500 }
    );
  }
}
