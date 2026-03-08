import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");

    let query = supabase
      .from("subscription_plans")
      .select(`
        *,
        subscription_plan_features(
          *,
          subscription_features(*)
        ),
        subscription_plan_prices(*)
      `)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (audience) {
      query = query.eq("audience", audience);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if ((data || []).length === 0) {
      let fallbackQuery = supabase
        .from("subscription_plans")
        .select(`
          *,
          subscription_plan_features(
            *,
            subscription_features(*)
          ),
          subscription_plan_prices(*)
        `)
        .order("sort_order", { ascending: true });

      if (audience) {
        fallbackQuery = fallbackQuery.eq("audience", audience);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        throw fallbackError;
      }

      return NextResponse.json({ success: true, data: fallbackData || [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Failed to fetch public plans:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
