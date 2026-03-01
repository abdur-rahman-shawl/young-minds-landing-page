import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPlanFeatures,
  getUserSubscription,
  type SubscriptionContext,
  type SubscriptionPlanFeature,
} from "@/lib/subscriptions/enforcement";
import { getUsageRowsForSubscription } from "@/lib/db/queries/subscriptions";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    const { searchParams } = new URL(request.url);
    const audienceParam = searchParams.get('audience');
    const audience =
      audienceParam === 'mentor' || audienceParam === 'mentee' ? audienceParam : null;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (audienceParam && !audience) {
      return NextResponse.json(
        { success: false, message: "Invalid audience. Use 'mentor' or 'mentee'." },
        { status: 400 }
      );
    }

    let subscription = null;
    let planFeatures: SubscriptionPlanFeature[] = [];
    const subscriptionContext: SubscriptionContext | undefined = audience
      ? { audience, actorRole: audience }
      : undefined;

    try {
      subscription = await getUserSubscription(userId, subscriptionContext);
      planFeatures = await getPlanFeatures(userId, subscriptionContext);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('audience context is required')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Multiple active subscriptions found. Please provide audience=mentor|mentee.',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: true, data: [] });
    }

    const data = await getUsageRowsForSubscription(subscription.subscription_id);
    type UsageRow = Awaited<ReturnType<typeof getUsageRowsForSubscription>>[number];

    const usageByFeatureKey = new Map<string, UsageRow>(
      (data || []).map((item: UsageRow) => [
        item.subscription_features?.feature_key,
        item,
      ])
    );

    const normalized = planFeatures
      .filter((feature) => feature.is_metered)
      .map((feature: SubscriptionPlanFeature) => {
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
