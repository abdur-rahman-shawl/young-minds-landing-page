"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CalendarClock,
  Inbox,
  PieChart,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAdminOverviewQuery } from "@/hooks/queries/use-admin-queries";

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const formatPercentage = (value: number | null) =>
  value === null
    ? "--"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);

export function AdminOverview() {
  const { data: overview, isLoading, error } = useAdminOverviewQuery();

  if (isLoading || !overview) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading admin overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load admin overview"}
        </p>
      </div>
    );
  }

  const lastRefreshed = new Date(overview.lastRefreshedAt).toLocaleTimeString();

  const overallCards = [
    {
      title: "Total people",
      value: formatNumber(overview.totals.totalUsers),
      description: `${formatNumber(overview.totals.totalMentors)} mentors | ${formatNumber(overview.totals.totalMentees)} mentees`,
      icon: Users,
    },
    {
      title: "Total mentors",
      value: formatNumber(overview.mentors.total),
      description: `${formatNumber(overview.mentors.verified)} verified to date`,
      icon: UserCheck,
    },
    {
      title: "Total mentees",
      value: formatNumber(overview.mentees.total),
      description: `${formatNumber(overview.mentees.joinedThisWeek)} joined this week`,
      icon: UserPlus,
    },
    {
      title: "Total enquiries",
      value: formatNumber(overview.enquiries.total),
      description: `${formatNumber(overview.enquiries.open)} open enquiries`,
      icon: Inbox,
    },
  ];

  const mentorCards = [
    {
      title: "Active mentors",
      value: formatNumber(overview.mentors.available),
      description: "Accepting sessions right now",
      icon: UserCheck,
    },
    {
      title: "Pending applications",
      value: formatNumber(overview.mentors.pending),
      description: `${formatNumber(overview.mentors.needsFollowUp)} require follow-up`,
      icon: AlertTriangle,
    },
    {
      title: "Mentors onboarded this week",
      value: formatNumber(overview.mentors.joinedThisWeek),
      description: "Created in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Verified mentor rate",
      value: formatPercentage(overview.mentors.verifiedRate),
      description: "Share of mentors fully approved",
      icon: PieChart,
    },
  ];

  const menteeCards = [
    {
      title: "Mentees joined this week",
      value: formatNumber(overview.mentees.joinedThisWeek),
      description: "New learners in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Total mentees",
      value: formatNumber(overview.mentees.total),
      description: "Lifetime enrolled mentees",
      icon: UserPlus,
    },
  ];

  const renderCardGrid = (
    cards: {
      title: string;
      value: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
    }[],
  ) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ title, value, description, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-foreground">
                {title}
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-muted-foreground">
                {description}
              </CardDescription>
            </div>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">
            A snapshot of how mentors and mentees are progressing across the platform.
          </p>
        </div>
        {lastRefreshed && (
          <span className="text-xs text-muted-foreground">Last refreshed {lastRefreshed}</span>
        )}
      </div>

      <section aria-labelledby="overall-insights" className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 id="overall-insights" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Overall
          </h2>
          <Separator className="flex-1" />
        </div>
        {renderCardGrid(overallCards)}
      </section>

      <section aria-labelledby="mentor-insights" className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 id="mentor-insights" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mentor Pipeline
          </h2>
          <Separator className="flex-1" />
        </div>
        {renderCardGrid(mentorCards)}
      </section>

      <section aria-labelledby="mentee-insights" className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 id="mentee-insights" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mentee Growth
          </h2>
          <Separator className="flex-1" />
        </div>
        {renderCardGrid(menteeCards)}
      </section>
    </div>
  );
}

