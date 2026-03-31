"use client"

import { Suspense } from "react"

import { AuthLoadingSkeleton } from "@/components/common/skeletons"
import { DashboardExperience } from "@/components/dashboard/dashboard-experience"

export function DashboardShell() {
  return (
    <DashboardExperience
      routeBasePath="/dashboard"
      redirectUnauthenticatedTo="/auth?callbackUrl=/dashboard"
      shellBackgroundClassName="bg-slate-50/50 dark:bg-[#0B0D13]"
    />
  )
}

export function DashboardShellWithSuspense() {
  return (
    <Suspense fallback={<AuthLoadingSkeleton />}>
      <DashboardShell />
    </Suspense>
  )
}
