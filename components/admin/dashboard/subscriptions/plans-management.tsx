"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Eye,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PlanFeatureEditor } from "./plan-feature-editor";

interface SubscriptionPlan {
  id: string;
  plan_key: string;
  audience: "mentor" | "mentee";
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  sort_order: number;
  metadata: Record<string, any>;
  feature_count: number;
  price_count: number;
  created_at: string;
}

export function PlansManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterAudience, setFilterAudience] = useState<"all" | "mentor" | "mentee">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "active" | "archived">("all");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions/plans", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPlans(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (formData: {
    plan_key: string;
    audience: "mentor" | "mentee";
    name: string;
    description: string;
    status: "draft" | "active";
  }) => {
    try {
      const res = await fetch("/api/admin/subscriptions/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Plan created successfully");
        loadPlans();
        setIsCreateDialogOpen(false);
        return true;
      } else {
        toast.error(data.message || "Failed to create plan");
        return false;
      }
    } catch (error) {
      console.error("Failed to create plan:", error);
      toast.error("Failed to create plan");
      return false;
    }
  };

  const updatePlan = async (
    planId: string,
    updates: Partial<SubscriptionPlan>
  ) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Plan updated successfully");
        loadPlans();
        return true;
      } else {
        toast.error(data.message || "Failed to update plan");
        return false;
      }
    } catch (error) {
      console.error("Failed to update plan:", error);
      toast.error("Failed to update plan");
      return false;
    }
  };

  const deletePlan = async (planId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this plan? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/subscriptions/plans/${planId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Plan deleted successfully");
        loadPlans();
      } else {
        toast.error(data.message || "Failed to delete plan");
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const filteredPlans = plans.filter((plan) => {
    if (filterAudience !== "all" && plan.audience !== filterAudience) return false;
    if (filterStatus !== "all" && plan.status !== filterStatus) return false;
    return true;
  });

  const mentorPlans = filteredPlans.filter((p) => p.audience === "mentor");
  const menteePlans = filteredPlans.filter((p) => p.audience === "mentee");

  if (loading) {
    return <div>Loading plans...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>
                Create and manage dynamic subscription plans for mentors and mentees
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <CreatePlanDialog onCreate={createPlan} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Filter by Audience</Label>
              <Select
                value={filterAudience}
                onValueChange={(v: any) => setFilterAudience(v)}
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
            <div className="flex-1">
              <Label>Filter by Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(v: any) => setFilterStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mentor Plans */}
      {(filterAudience === "all" || filterAudience === "mentor") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Mentor Plans
              <Badge variant="secondary">{mentorPlans.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mentorPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => setEditingPlan(plan)}
                  onDelete={() => deletePlan(plan.id)}
                  onStatusChange={(status) =>
                    updatePlan(plan.id, { status } as any)
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mentee Plans */}
      {(filterAudience === "all" || filterAudience === "mentee") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Mentee Plans
              <Badge variant="secondary">{menteePlans.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {menteePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => setEditingPlan(plan)}
                  onDelete={() => deletePlan(plan.id)}
                  onStatusChange={(status) =>
                    updatePlan(plan.id, { status } as any)
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <EditPlanDialog
              plan={editingPlan}
              onUpdate={(updates) => updatePlan(editingPlan.id, updates)}
              onClose={() => setEditingPlan(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: "draft" | "active" | "archived") => void;
}) {
  const statusColors = {
    draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
    active: "bg-green-100 text-green-800 border-green-200",
    archived: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{plan.plan_key}</p>
          </div>
          <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">
          {plan.description || "No description"}
        </p>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{plan.feature_count} features</span>
          <span>•</span>
          <span>{plan.price_count} prices</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <Settings className="mr-1 h-3 w-3" />
            Manage
          </Button>
          <Select
            value={plan.status}
            onValueChange={(v: any) => onStatusChange(v)}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Plan Dialog
function CreatePlanDialog({
  onCreate,
}: {
  onCreate: (data: {
    plan_key: string;
    audience: "mentor" | "mentee";
    name: string;
    description: string;
    status: "draft" | "active";
  }) => Promise<boolean>;
}) {
  const [formData, setFormData] = useState({
    plan_key: "",
    audience: "mentee" as "mentor" | "mentee",
    name: "",
    description: "",
    status: "draft" as "draft" | "active",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onCreate(formData);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create Subscription Plan</DialogTitle>
        <DialogDescription>
          Create a new subscription plan with custom features and pricing
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Pro Plan"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan_key">Plan Key *</Label>
            <Input
              id="plan_key"
              placeholder="e.g., mentee_pro"
              value={formData.plan_key}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  plan_key: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                })
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier (lowercase, underscores only)
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="audience">Audience *</Label>
            <Select
              value={formData.audience}
              onValueChange={(v: any) =>
                setFormData({ ...formData, audience: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mentor">Mentors</SelectItem>
                <SelectItem value="mentee">Mentees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Initial Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(v: any) =>
                setFormData({ ...formData, status: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe this plan..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Edit Plan Dialog (full feature assignment will go here)
function EditPlanDialog({
  plan,
  onUpdate,
  onClose,
}: {
  plan: SubscriptionPlan;
  onUpdate: (updates: Partial<SubscriptionPlan>) => Promise<boolean>;
  onClose: () => void;
}) {
  return (
    <div>
      <DialogHeader>
        <DialogTitle>Edit Plan: {plan.name}</DialogTitle>
        <DialogDescription>
          Manage plan details, features, and pricing
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <PlanFeatureEditor planId={plan.id} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}
