import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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
    const { planId } = await params;
    const body = await request.json();
    const updates = updatePlanSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
    const { planId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete plan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete plan' },
      { status: 500 }
    );
  }
}
