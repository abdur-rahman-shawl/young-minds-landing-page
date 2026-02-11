"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "@/components/shared/subscription/plan-card";
import { UsageMeter } from "@/components/shared/subscription/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

interface SubscriptionFeature {
  feature_key: string;
  feature_name: string;
  is_included: boolean;
  value_type: "boolean" | "count" | "minutes" | "text" | "amount" | "percent" | "json";
  limit_count: number | null;
  limit_minutes: number | null;
  limit_text: string | null;
  limit_amount: number | null;
  limit_percent: number | null;
  limit_json: Record<string, any> | null;
  limit_interval: "day" | "week" | "month" | "year" | null;
  limit_interval_count: number | null;
  is_metered: boolean;
  unit?: string | null;
}

interface SubscriptionInfo {
  plan_id: string;
  plan_name: string;
  status: string;
  audience: "mentor" | "mentee";
  current_period_end: string | null;
}

interface UsageEntry {
  feature_key: string;
  name: string;
  value_type: "boolean" | "count" | "minutes" | "text" | "amount" | "percent" | "json";
  unit: string | null;
  usage_count: number;
  usage_minutes: number;
  usage_amount: number;
  limit_count: number | null;
  limit_minutes: number | null;
  limit_amount: number | null;
  limit_percent: number | null;
}

interface PublicPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  audience: "mentor" | "mentee";
  subscription_plan_features: Array<{
    id: string;
    is_included: boolean;
    limit_count: number | null;
    limit_minutes: number | null;
    limit_text: string | null;
    limit_amount: number | null;
    limit_percent: number | null;
    limit_interval: string | null;
    limit_interval_count: number | null;
    subscription_features: {
      feature_key: string;
      name: string;
      unit: string | null;
    };
  }>;
  subscription_plan_prices: Array<{
    id: string;
    amount: number;
    currency: string;
    billing_interval: string;
    billing_interval_count: number;
    is_active: boolean;
  }>;
}

function formatLimit(feature: SubscriptionFeature) {
  if (!feature.is_included) return "Not included";
  if (feature.value_type === "boolean") return "Included";
  if (feature.value_type === "text" && feature.limit_text) return feature.limit_text;

  const interval =
    feature.limit_interval && feature.limit_interval_count
      ? ` per ${feature.limit_interval_count} ${feature.limit_interval}`
      : feature.limit_interval
        ? ` per ${feature.limit_interval}`
        : "";

  if (feature.value_type === "count" && feature.limit_count !== null) {
    return `Up to ${feature.limit_count}${feature.unit ? ` ${feature.unit}` : ""}${interval}`;
  }
  if (feature.value_type === "minutes" && feature.limit_minutes !== null) {
    return `Up to ${feature.limit_minutes} minutes${interval}`;
  }
  if (feature.value_type === "amount" && feature.limit_amount !== null) {
    return `Up to ${feature.limit_amount}${interval}`;
  }
  if (feature.value_type === "percent" && feature.limit_percent !== null) {
    return `Up to ${feature.limit_percent}%${interval}`;
  }

  return "Included";
}

export function SubscriptionDisplay() {
  const { isMentor, isMentee } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);

  const loadSubscription = async () => {
    try {
      const preferredAudience = isMentor ? "mentor" : isMentee ? "mentee" : null;
      const audienceQuery = preferredAudience ? `?audience=${preferredAudience}` : "";

      const [subRes, usageRes] = await Promise.all([
        fetch(`/api/subscriptions/me${audienceQuery}`, { credentials: "include" }),
        fetch(`/api/subscriptions/me/usage${audienceQuery}`, { credentials: "include" }),
      ]);

      const subData = await subRes.json();
      const usageData = await usageRes.json();

      if (!subRes.ok || !subData.success) {
        setError(subData.message || "Failed to load subscription details");
        return;
      }

      const subscriptionInfo = subData.data.subscription;
      setSubscription(subscriptionInfo);
      setFeatures(subData.data.features || []);

      if (usageRes.ok && usageData.success) {
        setUsage(usageData.data || []);
      }

      const fallbackAudience = preferredAudience;
      const audienceParam = subscriptionInfo?.audience || fallbackAudience;
      const planUrl = audienceParam
        ? `/api/subscriptions/plans/public?audience=${audienceParam}`
        : "/api/subscriptions/plans/public";
      const planRes = await fetch(planUrl, { credentials: "include" });
      const planData = await planRes.json();
      if (planRes.ok && planData.success) {
        setPlans(planData.data || []);
      }
    } catch (err) {
      console.error("Failed to load subscription details:", err);
      setError("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const handleSelectPlan = async (plan: PublicPlan) => {
    if (selectingPlanId) return;
    const monthlyPrice = plan.subscription_plan_prices.find(
      (price) => price.billing_interval === "month" && price.is_active
    );

    setSelectingPlanId(plan.id);
    try {
      const res = await fetch("/api/subscriptions/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId: plan.id,
          priceId: monthlyPrice?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to select plan");
        return;
      }

      toast.success("Plan selected");
      await loadSubscription();
    } catch (error) {
      console.error("Failed to select plan:", error);
      toast.error("Failed to select plan");
    } finally {
      setSelectingPlanId(null);
    }
  };

  const meteredUsage = useMemo(
    () => usage.filter((entry) => ["count", "minutes", "amount", "percent"].includes(entry.value_type)),
    [usage]
  );

  if (loading) {
    return <div>Loading subscription details...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || "No subscription found."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {subscription ? (
        <PlanCard
          planName={subscription.plan_name}
          status={subscription.status}
          periodEnd={subscription.current_period_end}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You do not have an active subscription yet. Choose a plan to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-2xl">Choose a plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare plans and pick the one that matches your goals.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 px-0 md:grid-cols-2">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active plans available.</p>
          ) : (
            plans.map((plan) => {
              const monthlyPrice = plan.subscription_plan_prices.find(
                (price) => price.billing_interval === "month" && price.is_active
              );
              const isCurrent = subscription ? plan.id === subscription.plan_id : false;
              const priceLabel = monthlyPrice
                ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: monthlyPrice.currency || "USD",
                }).format(monthlyPrice.amount)
                : "Custom";

              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-2xl border ${isCurrent
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white"
                    } shadow-sm`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-24 ${isCurrent
                        ? "bg-gradient-to-r from-emerald-200 via-emerald-100 to-transparent"
                        : "bg-gradient-to-r from-amber-100 via-amber-50 to-transparent"
                      }`}
                  />
                  <div className="relative flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {plan.audience === "mentor" ? "Mentor Plan" : "Mentee Plan"}
                        </p>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.description || "No description"}
                        </p>
                      </div>
                      {isCurrent && (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-3xl font-semibold">{priceLabel}</span>
                      <span className="text-sm text-muted-foreground">/ month</span>
                    </div>

                    <div className="mt-6 space-y-2 text-sm text-slate-600">
                      {(plan.subscription_plan_features || [])
                        .filter((feature) => feature.is_included)
                        .map((feature) => {
                          const limitLabel = feature.limit_text
                            ? feature.limit_text
                            : feature.limit_count !== null
                              ? `${feature.limit_count}${feature.subscription_features.unit ? ` ${feature.subscription_features.unit}` : ""}`
                              : feature.limit_minutes !== null
                                ? `${feature.limit_minutes} minutes`
                                : feature.limit_amount !== null
                                  ? `${feature.limit_amount}`
                                  : feature.limit_percent !== null
                                    ? `${feature.limit_percent}%`
                                    : "Included";
                          return (
                            <div key={feature.id} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                              <div>
                                <p className="font-medium text-slate-800">
                                  {feature.subscription_features.name}
                                </p>
                                <p className="text-xs text-slate-500">{limitLabel}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-8">
                      <Button
                        disabled={isCurrent}
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full ${isCurrent ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"
                          }`}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : selectingPlanId === plan.id
                            ? "Selecting..."
                            : "Select Plan"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {subscription && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meteredUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No usage tracking available yet.</p>
              ) : (
                meteredUsage.map((entry) => (
                  <UsageMeter
                    key={entry.feature_key}
                    name={entry.name}
                    valueType={entry.value_type}
                    usageCount={entry.usage_count}
                    usageMinutes={entry.usage_minutes}
                    usageAmount={entry.usage_amount}
                    limitCount={entry.limit_count}
                    limitMinutes={entry.limit_minutes}
                    limitAmount={entry.limit_amount}
                    limitPercent={entry.limit_percent}
                    unit={entry.unit}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
