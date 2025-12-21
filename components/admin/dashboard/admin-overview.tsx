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
  AlertTriangle,
  CalendarClock,
  Inbox,
  PieChart,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    ? "--"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);

const toRecentCount = (items: { createdAt: string | null }[]) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!item.createdAt) return false;
    const parsed = Date.parse(item.createdAt);
    return !Number.isNaN(parsed) && parsed >= weekAgo;
  }).length;
};

export function AdminOverview() {
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [mentees, setMentees] = useState<MenteeItem[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const [mentorResponse, menteeResponse, enquiryResponse] = await Promise.all([
          fetch("/api/admin/mentors", { credentials: "include" }),
          fetch("/api/admin/mentees", { credentials: "include" }),
          fetch("/api/admin/enquiries", { credentials: "include" }),
        ]);

        const [mentorJson, menteeJson, enquiryJson] = await Promise.all([
          mentorResponse.json().catch(() => ({ success: false })),
          menteeResponse.json().catch(() => ({ success: false })),
          enquiryResponse.json().catch(() => ({ success: false })),
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

        if (enquiryResponse.ok && enquiryJson?.success && Array.isArray(enquiryJson.data)) {
          setEnquiryCount(enquiryJson.data.length);
        }

        setLastRefreshed(new Date().toLocaleTimeString());
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

    const mentorsThisWeek = toRecentCount(mentors);
    const menteesThisWeek = toRecentCount(mentees);

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

  const overallCards = [
    {
      title: "Total people",
      value: formatNumber(stats.totalUsers),
      description: `${formatNumber(stats.totalMentors)} mentors � ${formatNumber(stats.totalMentees)} mentees`,
      icon: Users,
    },
    {
      title: "Total mentors",
      value: formatNumber(stats.totalMentors),
      description: `${formatNumber(stats.verifiedMentors)} verified to date`,
      icon: UserCheck,
    },
    {
      title: "Total mentees",
      value: formatNumber(stats.totalMentees),
      description: `${formatNumber(stats.menteesThisWeek)} joined this week`,
      icon: UserPlus,
    },
    {
      title: "Total enquiries",
      value: formatNumber(enquiryCount),
      description: "Contact form submissions",
      icon: Inbox,
    },
  ];

  const mentorCards = [
    {
      title: "Active mentors",
      value: formatNumber(stats.availableMentors),
      description: "Accepting sessions right now",
      icon: UserCheck,
    },
    {
      title: "Pending applications",
      value: formatNumber(stats.pendingMentors),
      description: `${formatNumber(stats.needsFollowUpMentors)} require follow-up`,
      icon: AlertTriangle,
    },
    {
      title: "Mentors onboarded this week",
      value: formatNumber(stats.mentorsThisWeek),
      description: "Created in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Verified mentor rate",
      value: formatPercentage(stats.verifiedRate),
      description: "Share of mentors fully approved",
      icon: PieChart,
    },
  ];

  const menteeCards = [
    {
      title: "Mentees joined this week",
      value: formatNumber(stats.menteesThisWeek),
      description: "New learners in the last 7 days",
      icon: CalendarClock,
    },
    {
      title: "Total mentees",
      value: formatNumber(stats.totalMentees),
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
        {!loading && lastRefreshed && (
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

