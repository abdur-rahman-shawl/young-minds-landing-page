import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/api/guards";

const createPriceSchema = z.object({
  price_type: z.enum(["standard", "introductory"]),
  billing_interval: z.enum(["day", "week", "month", "year"]),
  billing_interval_count: z.number().int().min(1),
  amount: z.number().min(0),
  currency: z.string().min(1),
  is_active: z.boolean().optional(),
  effective_from: z.string().datetime().optional(),
  effective_to: z.string().datetime().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const guard = await requireAdmin(request);
    if ("error" in guard) {
      return guard.error;
    }

    const { planId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscription_plan_prices")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Failed to fetch plan prices:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch plan prices" },
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
    if ("error" in guard) {
      return guard.error;
    }

    const { planId } = await params;
    const body = await request.json();
    const payload = createPriceSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscription_plan_prices")
      .insert({
        plan_id: planId,
        price_type: payload.price_type,
        billing_interval: payload.billing_interval,
        billing_interval_count: payload.billing_interval_count,
        amount: payload.amount,
        currency: payload.currency,
        is_active: payload.is_active ?? true,
        effective_from: payload.effective_from ?? null,
        effective_to: payload.effective_to ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to create plan price:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid input", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to create plan price" },
      { status: 500 }
    );
  }
}
