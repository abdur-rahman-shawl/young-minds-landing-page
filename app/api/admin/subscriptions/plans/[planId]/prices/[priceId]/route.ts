import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updatePriceSchema = z.object({
  price_type: z.enum(["standard", "introductory"]).optional(),
  billing_interval: z.enum(["day", "week", "month", "year"]).optional(),
  billing_interval_count: z.number().int().min(1).optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  effective_from: z.string().datetime().nullable().optional(),
  effective_to: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; priceId: string }> }
) {
  try {
    const { planId, priceId } = await params;
    const body = await request.json();
    const updates = updatePriceSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscription_plan_prices")
      .update(updates)
      .eq("id", priceId)
      .eq("plan_id", planId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to update plan price:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid input", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update plan price" },
      { status: 500 }
    );
  }
}
