import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
    const { featureId } = await params;
    const body = await request.json();
    const updates = updateFeatureSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscription_features")
      .update(updates)
      .eq("id", featureId)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
