"use client";

import { useEffect, useMemo, useState } from "react";
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

interface MentorItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  verificationStatus: string;
  isAvailable: boolean | null;
  createdAt: string | null;
}

interface MenteeItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  currentRole: string | null;
  careerGoals: string | null;
  createdAt: string | null;
}

const pendingStatuses = new Set([
  "YET_TO_APPLY",
  "IN_PROGRESS",
  "REVERIFICATION",
]);

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const formatPercentage = (value: number | null) =>
  value === null
    ? "–"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);

export function AdminDashboard() {
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [mentees, setMentees] = useState<MenteeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [mentorResponse, menteeResponse] = await Promise.all([
          fetch("/api/admin/mentors", { credentials: "include" }),
          fetch("/api/admin/mentees", { credentials: "include" }),
        ]);

        const [mentorJson, menteeJson] = await Promise.all([
          mentorResponse.json(),
          menteeResponse.json(),
        ]);

        if (mentorResponse.ok && mentorJson?.success) {
          setMentors(mentorJson.data ?? []);
        }

        if (menteeResponse.ok && menteeJson?.success) {
          setMentees(menteeJson.data ?? []);
        }
      } catch (error) {
        console.error("Admin dashboard fetch error", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const totalMentors = mentors.length;
    const totalMentees = mentees.length;
    const totalUsers = totalMentors + totalMentees;

    const verifiedMentors = mentors.filter(
      (mentor) => mentor.verificationStatus === "VERIFIED",
    ).length;

    const availableMentors = mentors.filter(
      (mentor) =>
        mentor.verificationStatus === "VERIFIED" && mentor.isAvailable !== false,
    ).length;

    const pendingMentors = mentors.filter((mentor) =>
      pendingStatuses.has(mentor.verificationStatus),
    ).length;

    const needsFollowUpMentors = mentors.filter((mentor) =>
      mentor.verificationStatus === "REJECTED" ||
      mentor.verificationStatus === "REVERIFICATION",
    ).length;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const isWithinLastWeek = (isoDate: string | null | undefined) => {
      if (!isoDate) return false;
      const parsed = Date.parse(isoDate);
      if (Number.isNaN(parsed)) return false;
      return parsed >= weekAgo;
    };

    const mentorsThisWeek = mentors.filter((mentor) =>
      isWithinLastWeek(mentor.createdAt),
    ).length;
    const menteesThisWeek = mentees.filter((mentee) =>
      isWithinLastWeek(mentee.createdAt),
    ).length;

    const verifiedRate = totalMentors
      ? verifiedMentors / Math.max(totalMentors, 1)
      : null;

    return {
      totalMentors,
      totalMentees,
      totalUsers,
      verifiedMentors,
      availableMentors,
      pendingMentors,
      needsFollowUpMentors,
      mentorsThisWeek,
      menteesThisWeek,
      verifiedRate,
    };
  }, [mentors, mentees]);

  const updateStatus = async (mentorId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/mentors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mentorId, status }),
      });
      const json = await res.json();
      if (json.success) {
        setMentors((prev) =>
          prev.map((m) =>
            m.id === mentorId ? { ...m, verificationStatus: status } : m,
          ),
        );
      }
    } catch (e) {
      console.error("Status update error", e);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard metrics…</p>
      </div>
    );
  }

  const primaryCards = [
    {
      title: "Total mentors",
      value: formatNumber(stats.totalMentors),
      description: `${formatNumber(stats.verifiedMentors)} verified so far`,
      icon: Users,
    },
    {
      title: "Active mentors",
      value: formatNumber(stats.availableMentors),
      description: "Accepting sessions right now",
      icon: UserCheck,
    },
    {
      title: "Pending mentor applications",
      value: formatNumber(stats.pendingMentors),
      description: `${formatNumber(stats.needsFollowUpMentors)} need follow-up`,
      icon: AlertTriangle,
    },
    {
      title: "Total mentees",
      value: formatNumber(stats.totalMentees),
      description: `${formatNumber(stats.totalUsers)} total people in system`,
      icon: UserPlus,
    },
  ];

  const secondaryCards = [
    {
      title: "Mentors onboarded this week",
      value: formatNumber(stats.mentorsThisWeek),
      description: "Created in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Mentees joined this week",
      value: formatNumber(stats.menteesThisWeek),
      description: "New learners in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Mentors needing updates",
      value: formatNumber(stats.needsFollowUpMentors),
      description: "Rejected or flagged for revisions",
      icon: AlertTriangle,
    },
    {
      title: "Verified mentor rate",
      value: formatPercentage(stats.verifiedRate),
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
                      {mentors.map((m) => (
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
                                {["YET_TO_APPLY", "IN_PROGRESS", "VERIFIED", "REJECTED", "REVERIFICATION"].map(
                                  (status) => (
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
