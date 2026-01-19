"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface PlanPrice {
  id: string;
  price_type: "standard" | "introductory";
  billing_interval: "day" | "week" | "month" | "year";
  billing_interval_count: number;
  amount: number;
  currency: string;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

interface PlanPricingEditorProps {
  planId: string;
}

const defaultForm = {
  price_type: "standard" as const,
  billing_interval: "month" as const,
  billing_interval_count: 1,
  amount: 0,
  currency: "INR",
  is_active: true,
};

export function PlanPricingEditor({ planId }: PlanPricingEditorProps) {
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingPrice, setEditingPrice] = useState<PlanPrice | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);

  const loadPrices = async () => {
    try {
      const res = await fetch(`/api/admin/subscriptions/plans/${planId}/prices`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPrices(data.data || []);
      } else {
        toast.error(data.message || "Failed to load plan prices");
      }
    } catch (error) {
      console.error("Failed to load plan prices:", error);
      toast.error("Failed to load plan prices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, [planId]);

  const createPrice = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/plans/${planId}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Price added");
        setForm(defaultForm);
        loadPrices();
      } else {
        toast.error(data.message || "Failed to add price");
      }
    } catch (error) {
      console.error("Failed to add price:", error);
      toast.error("Failed to add price");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (price: PlanPrice, nextValue: boolean) => {
    try {
      const res = await fetch(
        `/api/admin/subscriptions/plans/${planId}/prices/${price.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ is_active: nextValue }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setPrices((prev) =>
          prev.map((item) => (item.id === price.id ? { ...item, is_active: nextValue } : item))
        );
      } else {
        toast.error(data.message || "Failed to update price");
      }
    } catch (error) {
      console.error("Failed to update price:", error);
      toast.error("Failed to update price");
    }
  };

  const startEditing = (price: PlanPrice) => {
    setEditingPrice(price);
    setEditForm({
      price_type: price.price_type,
      billing_interval: price.billing_interval,
      billing_interval_count: price.billing_interval_count,
      amount: price.amount,
      currency: price.currency,
      is_active: price.is_active,
    });
  };

  const updatePrice = async () => {
    if (!editingPrice) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/subscriptions/plans/${planId}/prices/${editingPrice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editForm),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Price updated");
        setPrices((prev) =>
          prev.map((item) =>
            item.id === editingPrice.id
              ? {
                  ...item,
                  ...editForm,
                }
              : item
          )
        );
        setEditingPrice(null);
      } else {
        toast.error(data.message || "Failed to update price");
      }
    } catch (error) {
      console.error("Failed to update price:", error);
      toast.error("Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading prices...</p>
          ) : prices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prices configured yet.</p>
          ) : (
            <div className="space-y-3">
              {prices.map((price) => (
                <div
                  key={price.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {price.currency} {price.amount} / {price.billing_interval}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {price.price_type} • every {price.billing_interval_count} {price.billing_interval}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(price)}
                    >
                      Edit
                    </Button>
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={price.is_active}
                      onCheckedChange={(checked) => toggleActive(price, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Billing Interval</Label>
              <Select
                value={form.billing_interval}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    billing_interval: value as PlanPrice["billing_interval"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interval Count</Label>
              <Input
                type="number"
                value={form.billing_interval_count}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    billing_interval_count: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Price Type</Label>
              <Select
                value={form.price_type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    price_type: value as PlanPrice["price_type"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="introductory">Introductory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={createPrice} disabled={saving}>
              {saving ? "Saving..." : "Add Price"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingPrice && (
        <Dialog open onOpenChange={() => setEditingPrice(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={editForm.amount}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        amount: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={editForm.currency}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
                  <Select
                    value={editForm.billing_interval}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        billing_interval: value as PlanPrice["billing_interval"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interval Count</Label>
                  <Input
                    type="number"
                    value={editForm.billing_interval_count}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        billing_interval_count: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price Type</Label>
                  <Select
                    value={editForm.price_type}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        price_type: value as PlanPrice["price_type"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="introductory">Introductory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(checked) =>
                      setEditForm((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPrice(null)}>
                Cancel
              </Button>
              <Button onClick={updatePrice} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
