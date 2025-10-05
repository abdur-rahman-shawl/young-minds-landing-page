"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserPlus,
  CalendarClock,
  AlertTriangle,
  PieChart,
} from "lucide-react";

interface MentorItem {
  id: string;
  verificationStatus: string;
  isAvailable: boolean | null;
  createdAt: string | null;
}

interface MenteeItem {
  id: string;
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
    ? "N/A"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);

export function AdminOverview() {
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
          mentorResponse.json().catch(() => ({ success: false })),
          menteeResponse.json().catch(() => ({ success: false })),
        ]);

        if (mentorResponse.ok && mentorJson?.success) {
          setMentors(
            (mentorJson.data ?? []).map((mentor: any) => ({
              id: mentor.id,
              verificationStatus: mentor.verificationStatus,
              isAvailable: mentor.isAvailable ?? null,
              createdAt: mentor.createdAt ?? null,
            })),
          );
        }

        if (menteeResponse.ok && menteeJson?.success) {
          setMentees(
            (menteeJson.data ?? []).map((mentee: any) => ({
              id: mentee.id,
              createdAt: mentee.createdAt ?? null,
            })),
          );
        }
      } catch (error) {
        console.error("Admin overview fetch error", error);
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Admin Overview</h1>
        {loading && (
          <CardDescription className="text-sm">Refreshing metrics...</CardDescription>
        )}
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
    </div>
  );
}
