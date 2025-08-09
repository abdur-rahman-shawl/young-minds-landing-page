"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, Clock } from "lucide-react";

export function AdminOverview() {
  const stats = [
    { title: "Total Users", value: "--", icon: Users },
    { title: "Total Mentors", value: "--", icon: GraduationCap },
    { title: "Pending Applications", value: "--", icon: Clock },
  ];
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Admin Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <CardDescription>—</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 