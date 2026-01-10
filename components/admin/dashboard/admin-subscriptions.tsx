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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CreditCard,
  Package,
  Settings2,
  Users,
  TrendingUp,
  Plus,
} from "lucide-react";
import { PlansManagement } from "./subscriptions/plans-management";
import { FeaturesManagement } from "./subscriptions/features-management";
import { SubscriptionsOverview } from "./subscriptions/subscriptions-overview";
import { UsageAnalytics } from "./subscriptions/usage-analytics";

export function AdminSubscriptions() {
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    totalFeatures: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/admin/subscriptions/stats", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to load subscription stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading subscription management...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Plans",
      value: stats.totalPlans,
      description: `${stats.activePlans} active`,
      icon: Package,
    },
    {
      title: "Total Features",
      value: stats.totalFeatures,
      description: "Available features",
      icon: Settings2,
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      description: "Current users",
      icon: Users,
    },
    {
      title: "Revenue",
      value: "$0",
      description: "Monthly recurring",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen w-full">
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
                <p className="text-gray-600">
                  Dynamically manage plans, features, and pricing
                </p>
              </div>
              <Badge variant="secondary" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Admin Control
              </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ title, value, description, icon: Icon }) => (
                <Card key={title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="plans" className="space-y-4">
              <TabsList>
                <TabsTrigger value="plans">Plans</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="plans" className="space-y-4">
                <PlansManagement />
              </TabsContent>

              <TabsContent value="features" className="space-y-4">
                <FeaturesManagement />
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4">
                <SubscriptionsOverview />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <UsageAnalytics />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
