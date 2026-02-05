import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/api/guards";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ("error" in guard) {
      return guard.error;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscription_feature_categories")
      .select("id, category_key, name, description, icon, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Failed to fetch feature categories:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch feature categories" },
      { status: 500 }
    );
  }
}
