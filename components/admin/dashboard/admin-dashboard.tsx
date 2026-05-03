"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserPlus,
  CalendarClock,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminMentorsQuery,
  useAdminOverviewQuery,
  useAdminUpdateMentorMutation,
} from "@/hooks/queries/use-admin-queries";
import { toast } from "sonner";

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const formatPercentage = (value: number | null) =>
  value === null
    ? "�"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);

export function AdminDashboard() {
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useAdminOverviewQuery();
  const { data: mentors = [] } = useAdminMentorsQuery();
  const updateMentorMutation = useAdminUpdateMentorMutation();
  type MentorItem = (typeof mentors)[number];

  const updateStatus = async (mentorId: string, status: string) => {
    const existingMentor = mentors.find((mentor: MentorItem) => mentor.id === mentorId);
    if (!existingMentor) {
      return;
    }

    try {
      await updateMentorMutation.mutateAsync({
        mentorId,
        status: status as
          | "YET_TO_APPLY"
          | "IN_PROGRESS"
          | "VERIFIED"
          | "REJECTED"
          | "REVERIFICATION"
          | "RESUBMITTED"
          | "UPDATED_PROFILE",
        notes: existingMentor.verificationNotes ?? undefined,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update mentor status",
      );
    }
  };

  if (overviewLoading || !overview) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard metrics...</p>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-destructive">
          {overviewError instanceof Error
            ? overviewError.message
            : "Failed to load dashboard metrics"}
        </p>
      </div>
    );
  }

  const primaryCards = [
    {
      title: "Total mentors",
      value: formatNumber(overview.totals.totalMentors),
      description: `${formatNumber(overview.mentors.verified)} verified so far`,
      icon: Users,
    },
    {
      title: "Active mentors",
      value: formatNumber(overview.mentors.available),
      description: "Accepting sessions right now",
      icon: UserCheck,
    },
    {
      title: "Pending mentor applications",
      value: formatNumber(overview.mentors.pending),
      description: `${formatNumber(overview.mentors.needsFollowUp)} need follow-up`,
      icon: AlertTriangle,
    },
    {
      title: "Total mentees",
      value: formatNumber(overview.totals.totalMentees),
      description: `${formatNumber(overview.totals.totalUsers)} total people in system`,
      icon: UserPlus,
    },
  ];

  const secondaryCards = [
    {
      title: "Mentors onboarded this week",
      value: formatNumber(overview.mentors.joinedThisWeek),
      description: "Created in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Mentees joined this week",
      value: formatNumber(overview.mentees.joinedThisWeek),
      description: "New learners in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Mentors needing updates",
      value: formatNumber(overview.mentors.needsFollowUp),
      description: "Rejected or flagged for revisions",
      icon: AlertTriangle,
    },
    {
      title: "Verified mentor rate",
      value: formatPercentage(overview.mentors.verifiedRate),
      description: "Share of mentors fully approved",
      icon: PieChart,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen w-full">
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Platform management and oversight</p>
              </div>
              <Badge variant="secondary">Administrator</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {primaryCards.map(({ title, value, description, icon: Icon }) => (
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {secondaryCards.map(({ title, value, description, icon: Icon }) => (
                <Card key={title} className="border-dashed">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">{value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Mentor Applications</CardTitle>
                  <CardDescription>Applications awaiting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Admin functionality coming soon...
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                  <CardDescription>Recent platform activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Activity monitoring coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Mentors</CardTitle>
                <CardDescription>Manage mentor verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2">Name</th>
                        <th>Email</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentors.map((m: MentorItem) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{m.name}</td>
                          <td>{m.email}</td>
                          <td>{m.title}</td>
                          <td>
                            <Badge variant="outline">{m.verificationStatus}</Badge>
                          </td>
                          <td className="text-center">
                            <Select
                              defaultValue={m.verificationStatus}
                              onValueChange={(val) => updateStatus(m.id, val)}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {["YET_TO_APPLY", "IN_PROGRESS", "VERIFIED", "REJECTED", "REVERIFICATION", "UPDATED_PROFILE"].map(
                                  (status: string) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
