"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SubscriptionsOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Subscriptions</CardTitle>
        <CardDescription>
          View and manage user subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Subscription management interface - shows active subscriptions, usage, and billing details
        </p>
      </CardContent>
    </Card>
  );
}
