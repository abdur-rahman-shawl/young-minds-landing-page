import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { listFeatureCategories } from "@/lib/db/queries/subscriptions";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ("error" in guard) {
      return guard.error;
    }

    const data = await listFeatureCategories();

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Failed to fetch feature categories:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch feature categories" },
      { status: 500 }
    );
  }
}
