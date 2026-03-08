"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SubscriptionPlanInfo {
  id: string;
  plan_key: string;
  name: string;
  audience: "mentor" | "mentee";
}

interface SubscriptionPriceInfo {
  id: string;
  amount: number | null;
  currency: string | null;
  billing_interval: string | null;
  billing_interval_count: number | null;
  price_type: string | null;
  is_active: boolean | null;
}

interface SubscriptionUserInfo {
  id: string;
  name: string | null;
  email: string | null;
}

interface SubscriptionRecord {
  id: string;
  user_id: string | null;
  status: string;
  quantity: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  created_at: string | null;
  subscription_plans: SubscriptionPlanInfo | SubscriptionPlanInfo[] | null;
  subscription_plan_prices: SubscriptionPriceInfo | SubscriptionPriceInfo[] | null;
  user: SubscriptionUserInfo | null;
}

interface SubscriptionResponse {
  data: SubscriptionRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface SubscriptionApiResponse extends SubscriptionResponse {
  success: boolean;
  message?: string;
}

const statusOptions = [
  "all",
  "trialing",
  "active",
  "past_due",
  "paused",
  "canceled",
  "incomplete",
  "expired",
];

function normalizePlan(plan: SubscriptionRecord["subscription_plans"]) {
  if (Array.isArray(plan)) return plan[0] || null;
  return plan || null;
}

function normalizePrice(price: SubscriptionRecord["subscription_plan_prices"]) {
  if (Array.isArray(price)) return price[0] || null;
  return price || null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatPrice(price: SubscriptionPriceInfo | null) {
  if (!price || price.amount === null) return "Custom";
  const currency = price.currency || "USD";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price.amount);
  if (!price.billing_interval) return formatted;
  const intervalCount = price.billing_interval_count && price.billing_interval_count > 1
    ? `${price.billing_interval_count} ${price.billing_interval}s`
    : price.billing_interval;
  return `${formatted} / ${intervalCount}`;
}

function getStatusVariant(status: string) {
  if (status === "active" || status === "trialing") return "default";
  if (status === "past_due" || status === "canceled") return "destructive";
  return "secondary";
}

export function SubscriptionsOverview() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [total, setTotal] = useState(0);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        audience: audienceFilter,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const res = await fetch(`/api/admin/subscriptions/subscriptions?${params.toString()}`, {
        credentials: "include",
      });
      const data = (await res.json()) as SubscriptionApiResponse;
      if (res.ok && data.success) {
        setSubscriptions(data.data || []);
        setTotal(data.meta?.total || 0);
      } else {
        toast.error(data?.message || "Failed to load subscriptions");
      }
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter, audienceFilter, page, pageSize]);

  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return subscriptions;
    const term = searchTerm.toLowerCase();
    return subscriptions.filter((subscription) => {
      const plan = normalizePlan(subscription.subscription_plans);
      const user = subscription.user;
      return [
        subscription.user_id,
        user?.name,
        user?.email,
        plan?.name,
        plan?.plan_key,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [subscriptions, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              Monitor current subscriptions, billing windows, and plan assignments
            </CardDescription>
          </div>
          <Button variant="outline" onClick={loadSubscriptions}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search by user or plan..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Statuses" : status.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select
              value={audienceFilter}
              onValueChange={(value) => {
                setAudienceFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audiences</SelectItem>
                <SelectItem value="mentor">Mentors</SelectItem>
                <SelectItem value="mentee">Mentees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => {
                  const plan = normalizePlan(subscription.subscription_plans);
                  const price = normalizePrice(subscription.subscription_plan_prices);
                  const user = subscription.user;
                  return (
                    <tr key={subscription.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {user?.name || user?.email || subscription.user_id || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user?.email || subscription.user_id || "No user info"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium">{plan?.name || "Unknown plan"}</p>
                          <p className="text-xs text-muted-foreground">
                            {plan?.plan_key || "No plan key"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm capitalize">{plan?.audience || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(subscription.status)}>
                          {subscription.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>Start: {formatDate(subscription.current_period_start)}</p>
                          <p>End: {formatDate(subscription.current_period_end)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{formatPrice(price)}</p>
                        {subscription.quantity && subscription.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">
                            Qty: {subscription.quantity}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="capitalize">{subscription.provider || "manual"}</p>
                          {subscription.provider_subscription_id && (
                            <p className="break-all">{subscription.provider_subscription_id}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Showing {filteredSubscriptions.length} of {total} subscriptions
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
