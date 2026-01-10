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
import { Plus, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Feature {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  value_type: string;
  unit: string | null;
  is_metered: boolean;
  category_name: string | null;
}

export function FeaturesManagement() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
            <Button>
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
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
