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
import { Plus, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Feature {
  id: string;
  category_id: string | null;
  feature_key: string;
  name: string;
  description: string | null;
  value_type: FeatureValueType;
  unit: string | null;
  is_metered: boolean;
  category_name: string | null;
}

interface FeatureCategory {
  id: string;
  name: string;
}

type FeatureValueType = "boolean" | "count" | "minutes" | "text" | "amount" | "percent" | "json";

interface CreateFeatureFormState {
  feature_key: string;
  name: string;
  description: string;
  category_id: string;
  value_type: FeatureValueType;
  unit: string;
  is_metered: boolean;
}

const defaultCreateFormState: CreateFeatureFormState = {
  feature_key: "",
  name: "",
  description: "",
  category_id: "",
  value_type: "boolean",
  unit: "",
  is_metered: false,
};

export function FeaturesManagement() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [categories, setCategories] = useState<FeatureCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFeatureFormState>(defaultCreateFormState);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions/features", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeatures(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to load features:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions/feature-categories", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to load feature categories:", error);
    }
  };

  const handleEditOpen = (feature: Feature) => {
    setEditingFeature(feature);
    if (categories.length === 0) {
      void loadCategories();
    }
  };

  const handleCreateOpen = () => {
    setIsCreateDialogOpen(true);
    if (categories.length === 0) {
      void loadCategories();
    }
  };

  const handleCreate = async (draft: CreateFeatureFormState) => {
    const normalizedFeatureKey = draft.feature_key.trim();
    const normalizedName = draft.name.trim();
    const isValidFeatureKey = /^[a-z][a-z0-9_]*$/.test(normalizedFeatureKey);

    if (!normalizedName) {
      toast.error("Feature name is required");
      return;
    }

    if (!normalizedFeatureKey || !isValidFeatureKey) {
      toast.error("Feature key must be lowercase snake_case");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/subscriptions/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feature_key: normalizedFeatureKey,
          name: normalizedName,
          description: draft.description.trim() || null,
          category_id: draft.category_id || null,
          value_type: draft.value_type,
          unit: draft.unit.trim() || null,
          is_metered: draft.is_metered,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Feature created");
        setIsCreateDialogOpen(false);
        setCreateForm(defaultCreateFormState);
        await loadFeatures();
      } else {
        toast.error(data.message || "Failed to create feature");
      }
    } catch (error) {
      console.error("Failed to create feature:", error);
      toast.error("Failed to create feature");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (updated: Feature) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/features/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: updated.name,
          feature_key: updated.feature_key,
          description: updated.description,
          category_id: updated.category_id,
          value_type: updated.value_type,
          unit: updated.unit,
          is_metered: updated.is_metered,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Feature updated");
        setEditingFeature(null);
        loadFeatures();
      } else {
        toast.error(data.message || "Failed to update feature");
      }
    } catch (error) {
      console.error("Failed to update feature:", error);
      toast.error("Failed to update feature");
    } finally {
      setSaving(false);
    }
  };

  const filteredFeatures = features.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.feature_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByCategory = filteredFeatures.reduce((acc, feature) => {
    const category = feature.category_name || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (loading) return <div>Loading features...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feature Library</CardTitle>
              <CardDescription>
                Manage available features for subscription plans
              </CardDescription>
            </div>
            <Button type="button" onClick={handleCreateOpen}>
              <Plus className="mr-2 h-4 w-4" />
              Create Feature
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {Object.entries(groupedByCategory).map(([category, categoryFeatures]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {categoryFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{feature.name}</h4>
                      {feature.is_metered && (
                        <Badge variant="secondary" className="text-xs">
                          Metered
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {feature.feature_key} • Type: {feature.value_type}
                      {feature.unit && ` • Unit: ${feature.unit}`}
                    </p>
                    {feature.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {feature.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOpen(feature)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {editingFeature && (
        <Dialog open onOpenChange={() => setEditingFeature(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Feature</DialogTitle>
              <DialogDescription>
                Update the display details and limits metadata for this feature.
              </DialogDescription>
            </DialogHeader>
            <FeatureEditForm
              feature={editingFeature}
              categories={categories}
              saving={saving}
              onChange={setEditingFeature}
              onSave={handleSave}
              onCancel={() => setEditingFeature(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setCreateForm(defaultCreateFormState);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Feature</DialogTitle>
            <DialogDescription>
              Add a new feature that can be assigned to subscription plans.
            </DialogDescription>
          </DialogHeader>
          <CreateFeatureForm
            feature={createForm}
            categories={categories}
            saving={creating}
            onChange={setCreateForm}
            onSave={handleCreate}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setCreateForm(defaultCreateFormState);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureEditForm({
  feature,
  categories,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  feature: Feature;
  categories: FeatureCategory[];
  saving: boolean;
  onChange: (feature: Feature) => void;
  onSave: (feature: Feature) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(feature);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Feature Name</Label>
          <Input
            value={feature.name}
            onChange={(event) => onChange({ ...feature, name: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Feature Key</Label>
          <Input
            value={feature.feature_key}
            onChange={(event) => onChange({ ...feature, feature_key: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={feature.description || ""}
          onChange={(event) => onChange({ ...feature, description: event.target.value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={feature.category_id || "__none__"}
            onValueChange={(value) =>
              onChange({ ...feature, category_id: value === "__none__" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Value Type</Label>
          <Select
            value={feature.value_type}
            onValueChange={(value) => onChange({ ...feature, value_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input
            value={feature.unit || ""}
            onChange={(event) => onChange({ ...feature, unit: event.target.value })}
            placeholder="e.g., sessions, messages"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={feature.is_metered}
            onCheckedChange={(checked) => onChange({ ...feature, is_metered: checked })}
          />
          <Label>Is Metered</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CreateFeatureForm({
  feature,
  categories,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  feature: CreateFeatureFormState;
  categories: FeatureCategory[];
  saving: boolean;
  onChange: (feature: CreateFeatureFormState) => void;
  onSave: (feature: CreateFeatureFormState) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(feature);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Feature Name</Label>
          <Input
            value={feature.name}
            onChange={(event) => onChange({ ...feature, name: event.target.value })}
            placeholder="e.g., AI Helper Chat Access"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Feature Key</Label>
          <Input
            value={feature.feature_key}
            onChange={(event) =>
              onChange({ ...feature, feature_key: event.target.value.toLowerCase() })
            }
            placeholder="e.g., ai_helper_chat_access"
            required
          />
          <p className="text-xs text-muted-foreground">Lowercase with underscores only.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={feature.description}
          onChange={(event) => onChange({ ...feature, description: event.target.value })}
          placeholder="Describe what this feature controls"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={feature.category_id || "__none__"}
            onValueChange={(value) =>
              onChange({ ...feature, category_id: value === "__none__" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Value Type</Label>
          <Select
            value={feature.value_type}
            onValueChange={(value) => onChange({ ...feature, value_type: value as FeatureValueType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input
            value={feature.unit}
            onChange={(event) => onChange({ ...feature, unit: event.target.value })}
            placeholder="e.g., sessions, messages"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={feature.is_metered}
            onCheckedChange={(checked) => onChange({ ...feature, is_metered: checked })}
          />
          <Label>Is Metered</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Feature"}
        </Button>
      </DialogFooter>
    </form>
  );
}
