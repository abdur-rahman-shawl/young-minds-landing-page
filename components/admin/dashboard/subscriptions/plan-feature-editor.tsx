"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ValueType = "boolean" | "count" | "minutes" | "text" | "amount" | "percent" | "json";

interface PlanFeatureAssignment {
  id: string;
  plan_id: string;
  is_included: boolean;
  limit_count: number | null;
  limit_minutes: number | null;
  limit_text: string | null;
  limit_amount: number | null;
  limit_currency: string | null;
  limit_percent: number | null;
  limit_json: Record<string, any> | null;
  limit_interval: "day" | "week" | "month" | "year" | null;
  limit_interval_count: number | null;
}

interface FeatureItem {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  value_type: ValueType;
  unit: string | null;
  is_metered: boolean;
  subscription_feature_categories: { name: string | null; icon?: string | null } | null;
  subscription_plan_features?: PlanFeatureAssignment[] | null;
}

interface PlanFeatureEditorProps {
  planId: string;
}

interface FeatureFormState {
  is_included: boolean;
  limit_count: number | null;
  limit_minutes: number | null;
  limit_text: string;
  limit_amount: number | null;
  limit_currency: string;
  limit_percent: number | null;
  limit_json: string;
  limit_interval: "day" | "week" | "month" | "year" | "";
  limit_interval_count: number | null;
}

const emptyFormState: FeatureFormState = {
  is_included: false,
  limit_count: null,
  limit_minutes: null,
  limit_text: "",
  limit_amount: null,
  limit_currency: "USD",
  limit_percent: null,
  limit_json: "",
  limit_interval: "",
  limit_interval_count: null,
};

export function PlanFeatureEditor({ planId }: PlanFeatureEditorProps) {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FeatureFormState>(emptyFormState);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const res = await fetch(`/api/admin/subscriptions/plans/${planId}/features`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setFeatures(data.data);
          if (data.data.length > 0) {
            setSelectedFeatureId(data.data[0].id);
          }
        } else {
          toast.error(data.message || "Failed to load plan features");
        }
      } catch (error) {
        console.error("Failed to load plan features:", error);
        toast.error("Failed to load plan features");
      } finally {
        setLoading(false);
      }
    };

    loadFeatures();
  }, [planId]);

  const filteredFeatures = useMemo(() => {
    return features.filter(
      (feature) =>
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.feature_key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [features, searchTerm]);

  const groupedFeatures = useMemo(() => {
    return filteredFeatures.reduce((acc, feature) => {
      const category = feature.subscription_feature_categories?.name || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(feature);
      return acc;
    }, {} as Record<string, FeatureItem[]>);
  }, [filteredFeatures]);

  const selectedFeature = useMemo(() => {
    return features.find((feature) => feature.id === selectedFeatureId) || null;
  }, [features, selectedFeatureId]);

  useEffect(() => {
    if (!selectedFeature) {
      setFormState(emptyFormState);
      return;
    }

    const assignment = selectedFeature.subscription_plan_features?.[0] || null;

    setFormState({
      is_included: assignment?.is_included ?? false,
      limit_count: assignment?.limit_count ?? null,
      limit_minutes: assignment?.limit_minutes ?? null,
      limit_text: assignment?.limit_text ?? "",
      limit_amount: assignment?.limit_amount ?? null,
      limit_currency: assignment?.limit_currency ?? "USD",
      limit_percent: assignment?.limit_percent ?? null,
      limit_json: assignment?.limit_json ? JSON.stringify(assignment.limit_json, null, 2) : "",
      limit_interval: assignment?.limit_interval ?? "",
      limit_interval_count: assignment?.limit_interval_count ?? null,
    });
  }, [selectedFeature]);

  const handleSave = async () => {
    if (!selectedFeature) return;

    let parsedJson: Record<string, any> | null = null;
    if (selectedFeature.value_type === "json" && formState.limit_json.trim()) {
      try {
        parsedJson = JSON.parse(formState.limit_json);
      } catch (error) {
        toast.error("Invalid JSON in limit configuration");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/plans/${planId}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feature_id: selectedFeature.id,
          is_included: formState.is_included,
          limit_count: formState.limit_count,
          limit_minutes: formState.limit_minutes,
          limit_text: formState.limit_text || null,
          limit_amount: formState.limit_amount,
          limit_currency: formState.limit_currency || null,
          limit_percent: formState.limit_percent,
          limit_json: parsedJson,
          limit_interval: formState.limit_interval || null,
          limit_interval_count: formState.limit_interval_count,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Feature updated");
        setFeatures((prev) =>
          prev.map((feature) => {
            if (feature.id !== selectedFeature.id) return feature;
            return {
              ...feature,
              subscription_plan_features: [data.data],
            };
          })
        );
      } else {
        toast.error(data.message || "Failed to save feature");
      }
    } catch (error) {
      console.error("Failed to save feature:", error);
      toast.error("Failed to save feature");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading plan features...</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_3fr] items-start">
      <Card className="h-full lg:max-h-[70vh]">
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search features..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="space-y-4 max-h-[56vh] overflow-y-auto pr-1">
            {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
              <div key={category} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </p>
                <div className="space-y-2">
                  {categoryFeatures.map((feature) => {
                    const assignment = feature.subscription_plan_features?.[0];
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => setSelectedFeatureId(feature.id)}
                        className={`w-full rounded-md border p-3 text-left transition ${
                          feature.id === selectedFeatureId
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{feature.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {feature.feature_key} • {feature.value_type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {feature.is_metered && (
                              <Badge variant="secondary" className="text-[10px]">
                                Metered
                              </Badge>
                            )}
                            <Badge variant={assignment?.is_included ? "default" : "outline"}>
                              {assignment?.is_included ? "Included" : "Excluded"}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="h-full lg:sticky lg:top-6 lg:self-start">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedFeature ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{selectedFeature.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedFeature.feature_key}</p>
                  </div>
                  <Switch
                    checked={formState.is_included}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, is_included: checked }))
                    }
                  />
                </div>
                {selectedFeature.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFeature.description}
                  </p>
                )}
              </div>

              {selectedFeature.value_type === "count" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Limit Count</Label>
                    <Input
                      type="number"
                      value={formState.limit_count ?? ""}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          limit_count: event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Limit Minutes (Optional)</Label>
                    <Input
                      type="number"
                      value={formState.limit_minutes ?? ""}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          limit_minutes: event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {selectedFeature.value_type === "minutes" && (
                <div className="space-y-2">
                  <Label>Limit Minutes</Label>
                  <Input
                    type="number"
                    value={formState.limit_minutes ?? ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        limit_minutes: event.target.value === "" ? null : Number(event.target.value),
                      }))
                    }
                  />
                </div>
              )}

              {selectedFeature.value_type === "text" && (
                <div className="space-y-2">
                  <Label>Limit Text</Label>
                  <Input
                    value={formState.limit_text}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, limit_text: event.target.value }))
                    }
                  />
                </div>
              )}

              {selectedFeature.value_type === "amount" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Limit Amount</Label>
                    <Input
                      type="number"
                      value={formState.limit_amount ?? ""}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          limit_amount: event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={formState.limit_currency}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, limit_currency: event.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {selectedFeature.value_type === "percent" && (
                <div className="space-y-2">
                  <Label>Limit Percent</Label>
                  <Input
                    type="number"
                    value={formState.limit_percent ?? ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        limit_percent: event.target.value === "" ? null : Number(event.target.value),
                      }))
                    }
                  />
                </div>
              )}

              {selectedFeature.value_type === "json" && (
                <div className="space-y-2">
                  <Label>Limit JSON</Label>
                  <Textarea
                    rows={6}
                    value={formState.limit_json}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, limit_json: event.target.value }))
                    }
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}

              {selectedFeature.is_metered && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Interval</Label>
                    <Select
                      value={formState.limit_interval}
                      onValueChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          limit_interval: value as FeatureFormState["limit_interval"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
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
                      value={formState.limit_interval_count ?? ""}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          limit_interval_count:
                            event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Feature
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a feature to configure.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
