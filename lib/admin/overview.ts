import type { VerificationStatus } from '@/lib/db/schema/mentors';

export const ADMIN_PENDING_MENTOR_STATUSES: VerificationStatus[] = [
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'REVERIFICATION',
  'RESUBMITTED',
  'UPDATED_PROFILE',
];

interface OverviewMentorRow {
  verificationStatus: VerificationStatus;
  isAvailable: boolean | null;
  createdAt: string | null;
}

interface OverviewMenteeRow {
  createdAt: string | null;
}

interface OverviewEnquiryRow {
  isResolved: boolean;
}

function isWithinLastSevenDays(value: string | null, now: Date) {
  if (!value) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return parsed >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
}

export function buildAdminOverview(
  input: {
    mentors: OverviewMentorRow[];
    mentees: OverviewMenteeRow[];
    enquiries: OverviewEnquiryRow[];
  },
  options?: {
    now?: Date;
  }
) {
  const now = options?.now ?? new Date();
  const totalMentors = input.mentors.length;
  const totalMentees = input.mentees.length;
  const totalUsers = totalMentors + totalMentees;

  const verifiedMentors = input.mentors.filter(
    (mentor) => mentor.verificationStatus === 'VERIFIED'
  ).length;

  const availableMentors = input.mentors.filter(
    (mentor) =>
      mentor.verificationStatus === 'VERIFIED' && mentor.isAvailable !== false
  ).length;

  const pendingMentors = input.mentors.filter((mentor) =>
    ADMIN_PENDING_MENTOR_STATUSES.includes(mentor.verificationStatus)
  ).length;

  const needsFollowUpMentors = input.mentors.filter(
    (mentor) =>
      mentor.verificationStatus === 'REJECTED' ||
      mentor.verificationStatus === 'REVERIFICATION'
  ).length;

  const mentorsThisWeek = input.mentors.filter((mentor) =>
    isWithinLastSevenDays(mentor.createdAt, now)
  ).length;

  const menteesThisWeek = input.mentees.filter((mentee) =>
    isWithinLastSevenDays(mentee.createdAt, now)
  ).length;

  const verifiedRate = totalMentors > 0 ? verifiedMentors / totalMentors : null;
  const enquiryTotal = input.enquiries.length;
  const resolvedEnquiries = input.enquiries.filter(
    (enquiry) => enquiry.isResolved
  ).length;
  const openEnquiries = enquiryTotal - resolvedEnquiries;

  return {
    totals: {
      totalUsers,
      totalMentors,
      totalMentees,
    },
    mentors: {
      total: totalMentors,
      verified: verifiedMentors,
      available: availableMentors,
      pending: pendingMentors,
      needsFollowUp: needsFollowUpMentors,
      joinedThisWeek: mentorsThisWeek,
      verifiedRate,
    },
    mentees: {
      total: totalMentees,
      joinedThisWeek: menteesThisWeek,
    },
    enquiries: {
      total: enquiryTotal,
      open: openEnquiries,
      resolved: resolvedEnquiries,
    },
    lastRefreshedAt: now.toISOString(),
  };
}
