"use client";

import { DashboardExperience } from "@/components/dashboard/dashboard-experience";

interface MenteeDashboardProps {
  user: any;
}

export function MenteeDashboard({ user: _user }: MenteeDashboardProps) {
  return (
    <DashboardExperience
      routeBasePath="/dashboard"
      shellBackgroundClassName="bg-slate-50/50 dark:bg-[#0B0D13]"
    />
  );
}
