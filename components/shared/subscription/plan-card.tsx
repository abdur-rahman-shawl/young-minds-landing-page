"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlanCardProps {
  planName: string;
  status: string;
  periodEnd?: string | null;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-100 text-blue-700 border-blue-200",
  past_due: "bg-amber-100 text-amber-700 border-amber-200",
  paused: "bg-gray-100 text-gray-700 border-gray-200",
  canceled: "bg-red-100 text-red-700 border-red-200",
  incomplete: "bg-slate-100 text-slate-700 border-slate-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
};

export function PlanCard({ planName, status, periodEnd }: PlanCardProps) {
  const daysRemaining = periodEnd
    ? Math.max(
        0,
        Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl">{planName}</CardTitle>
          {daysRemaining !== null && (
            <p className="mt-1 text-sm text-muted-foreground">
              {daysRemaining} days remaining in this billing period
            </p>
          )}
        </div>
        <Badge className={statusStyles[status] || ""}>{status}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Manage your plan features and keep track of usage in the sections below.
        </p>
      </CardContent>
    </Card>
  );
}
