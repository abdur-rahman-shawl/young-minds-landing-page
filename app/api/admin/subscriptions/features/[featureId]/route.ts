import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/guards";
import { featureKeyExists, updateFeature } from "@/lib/db/queries/subscriptions";

const updateFeatureSchema = z.object({
  name: z.string().min(1).optional(),
  feature_key: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category_id: z.string().uuid().optional(),
  value_type: z.enum(["boolean", "count", "minutes", "text", "amount", "percent", "json"]).optional(),
  unit: z.string().nullable().optional(),
  is_metered: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const guard = await requireAdmin(request);
    if ("error" in guard) {
      return guard.error;
    }

    const { featureId } = await params;
    const body = await request.json();
    const updates = updateFeatureSchema.parse(body);

    if (updates.feature_key && await featureKeyExists(updates.feature_key, featureId)) {
      return NextResponse.json(
        { success: false, message: `Feature key '${updates.feature_key}' already exists` },
        { status: 409 }
      );
    }

    const data = await updateFeature(featureId, updates);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to update feature:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid input", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update feature" },
      { status: 500 }
    );
  }
}
