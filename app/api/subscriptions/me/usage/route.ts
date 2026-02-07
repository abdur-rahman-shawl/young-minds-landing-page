import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPlanFeatures, getUserSubscription } from "@/lib/subscriptions/enforcement";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let subscription = null;
    let planFeatures = [];

    try {
      subscription = await getUserSubscription(userId);
      planFeatures = await getPlanFeatures(userId);
    } catch (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscription_usage_tracking")
      .select(
        `
        usage_count,
        usage_minutes,
        usage_amount,
        usage_json,
        period_start,
        period_end,
        limit_reached,
        subscription_features(feature_key, name, value_type, unit, is_metered)
      `
      )
      .eq("subscription_id", subscription.subscription_id);

    if (error) {
      throw error;
    }

    const usageByFeatureKey = new Map(
      (data || []).map((item) => [
        item.subscription_features?.feature_key,
        item,
      ])
    );

    const normalized = planFeatures
      .filter((feature) => feature.is_metered)
      .map((feature) => {
        const usage = usageByFeatureKey.get(feature.feature_key);
        return {
          feature_key: feature.feature_key,
          name: feature.feature_name,
          value_type: feature.value_type,
          unit: feature.unit ?? null,
          usage_count: usage?.usage_count ?? 0,
          usage_minutes: usage?.usage_minutes ?? 0,
          usage_amount: usage?.usage_amount ?? 0,
          usage_json: usage?.usage_json ?? {},
          period_start: usage?.period_start ?? subscription.current_period_start,
          period_end: usage?.period_end ?? subscription.current_period_end,
          limit_reached: usage?.limit_reached ?? false,
          limit_count: feature.limit_count,
          limit_minutes: feature.limit_minutes,
          limit_amount: feature.limit_amount,
          limit_percent: feature.limit_percent,
          limit_text: feature.limit_text,
          limit_interval: feature.limit_interval,
          limit_interval_count: feature.limit_interval_count,
        };
      });

    return NextResponse.json({ success: true, data: normalized });
  } catch (error) {
    console.error("Failed to load subscription usage:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load subscription usage" },
      { status: 500 }
    );
  }
}
