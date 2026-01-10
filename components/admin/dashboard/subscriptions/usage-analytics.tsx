"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function UsageAnalytics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Analytics</CardTitle>
        <CardDescription>
          Track feature usage across all subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Analytics dashboard - feature usage trends, quota consumption, and insights
        </p>
      </CardContent>
    </Card>
  );
}
