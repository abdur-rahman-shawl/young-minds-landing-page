import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUserWithRoles } from "@/lib/db/user-helpers";

const selectPlanSchema = z.object({
  planId: z.string().uuid(),
  priceId: z.string().uuid().optional(),
  status: z.enum(["active", "trialing"]).optional(),
});

function addInterval(date: Date, interval: string, count: number) {
  const result = new Date(date);
  switch (interval) {
    case "day":
      result.setDate(result.getDate() + count);
      break;
    case "week":
      result.setDate(result.getDate() + count * 7);
      break;
    case "year":
      result.setFullYear(result.getFullYear() + count);
      break;
    case "month":
    default:
      result.setMonth(result.getMonth() + count);
      break;
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userWithRoles = await getUserWithRoles(userId);
    if (!userWithRoles) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { planId, priceId, status } = selectPlanSchema.parse(body);

    const supabase = await createClient();

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, audience")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 });
    }

    const roleNames = new Set(userWithRoles.roles.map((role) => role.name));
    const isAdmin = roleNames.has("admin");
    if (!isAdmin) {
      const allowedAudiences = new Set<string>();
      if (roleNames.has("mentor")) allowedAudiences.add("mentor");
      if (roleNames.has("mentee")) allowedAudiences.add("mentee");

      if (!allowedAudiences.has(plan.audience)) {
        return NextResponse.json(
          { success: false, message: "Plan audience does not match your role" },
          { status: 403 }
        );
      }
    }

    let periodEnd = addInterval(new Date(), "month", 1);
    let selectedPriceId = priceId ?? null;

    if (priceId) {
      const { data: price, error: priceError } = await supabase
        .from("subscription_plan_prices")
        .select("id, plan_id, billing_interval, billing_interval_count")
        .eq("id", priceId)
        .single();

      if (priceError || !price || price.plan_id !== planId) {
        return NextResponse.json({ success: false, message: "Invalid price" }, { status: 400 });
      }

      periodEnd = addInterval(
        new Date(),
        price.billing_interval || "month",
        price.billing_interval_count || 1
      );
    }

    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId)
      .in("status", ["trialing", "active"]);

    const now = new Date();
    const { data: subscription, error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        price_id: selectedPriceId,
        status: status || "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error("Failed to select plan:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid input", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to select plan" },
      { status: 500 }
    );
  }
}
