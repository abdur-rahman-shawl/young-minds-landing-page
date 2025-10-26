'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  type LucideIcon,
  Users,
} from 'lucide-react';
import { ErrorBoundary, AuthErrorBoundary } from '@/components/common/error-boundary';

interface MentorDashboardProps {
  user: { name?: string | null } | null;
}

type VerificationStatus =
  | 'YET_TO_APPLY'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVERIFICATION'
  | 'RESUBMITTED';

type MentorApplication = {
  id: string;
  userId: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  expertise: string | null;
  experience: number | null;
  hourlyRate: string | null;
  currency: string | null;
  availability: string | null;
  maxMentees: number | null;
  headline: string | null;
  about: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  profileImageUrl: string | null;
  resumeUrl: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  isAvailable: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type StatusInfo = {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'secondary';
  };
};

type DetailGroup = {
  title: string;
  fields: {
    label: string;
    value: ReactNode;
  }[];
};

const statusAccent: Record<VerificationStatus, string> = {
  YET_TO_APPLY: 'bg-blue-100 text-blue-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-600',
  VERIFIED: 'bg-emerald-100 text-emerald-600',
  REJECTED: 'bg-red-100 text-red-600',
  REVERIFICATION: 'bg-purple-100 text-purple-600',
  RESUBMITTED: 'bg-sky-100 text-sky-600',
};

const statusBadgeCopy: Record<VerificationStatus, string> = {
  YET_TO_APPLY: 'Draft',
  IN_PROGRESS: 'In review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  REVERIFICATION: 'Updates requested',
  RESUBMITTED: 'Resubmitted',
};

function formatDate(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatList(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .filter(Boolean)
        .join(', ');
    }
  } catch (_err) {
    // Fall back to raw value when parsing fails.
  }
  return value;
}

function formatAvailability(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch (_err) {
    return value;
  }
}

function formatRate(rate: string | null, currency: string | null) {
  if (!rate) return null;
  const numeric = Number(rate);
  if (!Number.isNaN(numeric)) {
    return `${currency || 'USD'} ${numeric.toFixed(2)}`;
  }
  return rate;
}

function formatBoolean(value: boolean | null) {
  if (value === null) return null;
  return value ? 'Yes' : 'No';
}

function formatLocation(city: string | null, state: string | null, country: string | null) {
  const location = [city, state, country].filter(Boolean).join(', ');
  return location || null;
}

function renderText(value: string | null) {
  if (!value) return <span className='text-sm text-muted-foreground'>Not provided</span>;
  return <span className='text-sm text-foreground'>{value}</span>;
}

function renderMultiline(value: string | null) {
  if (!value) return <span className='text-sm text-muted-foreground'>Not provided</span>;
  return <p className='whitespace-pre-wrap text-sm leading-relaxed text-foreground'>{value}</p>;
}

function renderCode(value: string | null) {
  if (!value) return <span className='text-sm text-muted-foreground'>Not provided</span>;
  return (
    <pre className='max-h-64 overflow-auto rounded-md bg-slate-900/90 p-3 text-xs text-slate-50 shadow-inner'>
      {value}
    </pre>
  );
}

function renderLink(value: string | null, label: string) {
  if (!value) return <span className='text-sm text-muted-foreground'>Not provided</span>;
  return (
    <a
      href={value}
      target='_blank'
      rel='noopener noreferrer'
      className='text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline'
    >
      {label}
    </a>
  );
}

function buildDetailGroups(mentor: MentorApplication): DetailGroup[] {
  const expertise = formatList(mentor.expertise);
  const availability = formatAvailability(mentor.availability);
  const location = formatLocation(mentor.city, mentor.state, mentor.country);
  const rate = formatRate(mentor.hourlyRate, mentor.currency);
  const availabilityFlag = formatBoolean(mentor.isAvailable);

  return [
    {
      title: 'Application status',
      fields: [
        {
          label: 'Current status',
          value: <Badge variant='outline'>{mentor.verificationStatus}</Badge>,
        },
        {
          label: 'Status label',
          value: <span className='text-sm text-foreground'>{statusBadgeCopy[mentor.verificationStatus]}</span>,
        },
        {
          label: 'Reviewer notes',
          value: renderMultiline(mentor.verificationNotes),
        },
        {
          label: 'Last updated',
          value: <span className='text-sm text-foreground'>{formatDate(mentor.updatedAt)}</span>,
        },
        {
          label: 'Submitted on',
          value: <span className='text-sm text-foreground'>{formatDate(mentor.createdAt)}</span>,
        },
      ],
    },
    {
      title: 'Personal details',
      fields: [
        { label: 'Full name', value: renderText(mentor.fullName) },
        { label: 'Email', value: renderText(mentor.email) },
        { label: 'Phone', value: renderText(mentor.phone) },
        { label: 'Location', value: renderText(location) },
        { label: 'Profile image', value: renderLink(mentor.profileImageUrl, 'Open profile image') },
        { label: 'Resume', value: renderLink(mentor.resumeUrl, 'Download resume') },
      ],
    },
    {
      title: 'Professional overview',
      fields: [
        { label: 'Title', value: renderText(mentor.title) },
        { label: 'Company', value: renderText(mentor.company) },
        { label: 'Industry', value: renderText(mentor.industry) },
        { label: 'Headline', value: renderText(mentor.headline) },
        { label: 'About', value: renderMultiline(mentor.about) },
      ],
    },
    {
      title: 'Expertise & availability',
      fields: [
        { label: 'Expertise (raw)', value: renderMultiline(expertise) },
        { label: 'Years of experience', value: renderText(mentor.experience !== null ? mentor.experience.toString() : null) },
        { label: 'Hourly rate', value: renderText(rate) },
        { label: 'Max mentees', value: renderText(mentor.maxMentees !== null ? mentor.maxMentees.toString() : null) },
        { label: 'Availability details', value: renderCode(availability) },
        { label: 'Currently available', value: renderText(availabilityFlag) },
      ],
    },
    {
      title: 'Links',
      fields: [
        { label: 'LinkedIn', value: renderLink(mentor.linkedinUrl, 'View LinkedIn profile') },
        { label: 'GitHub', value: renderLink(mentor.githubUrl, 'View GitHub profile') },
        { label: 'Website', value: renderLink(mentor.websiteUrl, 'Open personal website') },
      ],
    },
    {
      title: 'Identifiers',
      fields: [
        { label: 'Mentor ID', value: renderText(mentor.id) },
        { label: 'User ID', value: renderText(mentor.userId) },
      ],
    },
  ];
}

interface NonVerifiedMentorViewProps {
  mentor: MentorApplication;
  status: VerificationStatus;
  userName?: string | null;
}

function NonVerifiedMentorView({ mentor, status, userName }: NonVerifiedMentorViewProps) {
  const router = useRouter();

  const statusInfo: StatusInfo = (() => {
    const base: StatusInfo = {
      icon: FileText,
      iconClass: 'text-slate-600',
      title: 'Mentor application status',
      description: `Hi${userName ? ` ${userName}` : ''}, we have your mentor application on file.`,
    };

    switch (status) {
      case 'YET_TO_APPLY':
        return {
          ...base,
          icon: FileText,
          iconClass: 'text-blue-600',
          title: 'Finish your mentor profile',
          description: 'You have not completed the mentor application yet. Review the details you saved and submit when ready.',
          action: {
            label: 'Complete application',
            onClick: () => router.push('/become-expert'),
          },
        };
      case 'IN_PROGRESS':
        return {
          ...base,
          icon: Clock,
          iconClass: 'text-amber-600',
          title: 'Application under review',
          description: 'Thanks for submitting your mentor profile. Our team is reviewing it and will notify you once a decision is made.',
        };
      case 'RESUBMITTED':
        return {
          ...base,
          icon: RotateCcw,
          iconClass: 'text-sky-600',
          title: 'Updates received',
          description: 'We received your updated mentor application. It is back in the review queue and we will be in touch soon.',
        };
      case 'REJECTED':
        return {
          ...base,
          icon: ShieldAlert,
          iconClass: 'text-red-600',
          title: 'Application declined',
          description: 'The review team was unable to approve your mentor application. Check the reviewer note below before submitting again.',
          action: {
            label: 'Update and reapply',
            onClick: () => router.push('/become-expert'),
            variant: 'outline',
          },
        };
      case 'REVERIFICATION':
        return {
          ...base,
          icon: RotateCcw,
          iconClass: 'text-purple-600',
          title: 'Updates requested',
          description: 'We need a few adjustments before we can re-verify your mentor profile. Review the note below and prepare your updates.',
          action: {
            label: 'Update & resubmit (coming soon)',
            disabled: true,
            variant: 'secondary',
          },
        };
      default:
        return base;
    }
  })();

  const StatusIcon = statusInfo.icon;
  const detailGroups = useMemo(() => buildDetailGroups(mentor), [mentor]);
  const rawSubmission = useMemo(() => JSON.stringify(mentor, null, 2), [mentor]);

  return (
    <AuthErrorBoundary>
      <ErrorBoundary>
        <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 dark:from-slate-950 dark:to-slate-950 dark:text-slate-100'>
          <main className='mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8'>
            <section className='space-y-4 text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'>
                <StatusIcon className={`h-8 w-8 ${statusInfo.iconClass}`} />
              </div>
              <div className='space-y-2'>
                <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>{statusInfo.title}</h1>
                <p className='text-base text-muted-foreground'>{statusInfo.description}</p>
              </div>
              <div className='flex items-center justify-center gap-3 text-sm text-muted-foreground'>
                <Badge className={statusAccent[status]}>{statusBadgeCopy[status]}</Badge>
                <span>Last updated {formatDate(mentor.updatedAt)}</span>
              </div>
              {statusInfo.action && (
                <Button
                  onClick={statusInfo.action.onClick}
                  disabled={statusInfo.action.disabled}
                  variant={statusInfo.action.variant || 'default'}
                >
                  {statusInfo.action.label}
                </Button>
              )}
            </section>

            {mentor.verificationNotes && (
              <Card className='border-dashed border-purple-200 bg-purple-50/60 text-purple-900 dark:border-purple-500/60 dark:bg-purple-500/10 dark:text-purple-100'>
                <CardHeader className='space-y-1'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <AlertCircle className='h-4 w-4' /> Reviewer note
                  </CardTitle>
                  <CardDescription className='text-sm text-purple-800 dark:text-purple-200'>
                    The latest feedback from our review team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='whitespace-pre-wrap text-sm leading-relaxed'>{mentor.verificationNotes}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Submitted application details</CardTitle>
                <CardDescription>A read-only copy of every field you have provided.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-8'>
                {detailGroups.map((group) => (
                  <section key={group.title} className='space-y-3'>
                    <h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{group.title}</h3>
                    <dl className='grid gap-6 sm:grid-cols-2'>
                      {group.fields.map((field) => (
                        <div key={`${group.title}-${field.label}`} className='space-y-1 rounded-md border border-slate-200/80 p-3 dark:border-slate-700/80'>
                          <dt className='text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400'>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw submission snapshot</CardTitle>
                <CardDescription>This JSON is pulled directly from your mentor record.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className='max-h-[32rem] overflow-auto rounded-md bg-slate-900/95 p-4 text-xs text-slate-100'>{rawSubmission}</pre>
              </CardContent>
            </Card>

            <p className='text-center text-sm text-muted-foreground'>
              Need help? Email <a href='mailto:mentors@youngminds.com' className='font-medium text-blue-600 hover:text-blue-700 hover:underline'>mentors@youngminds.com</a>
            </p>
          </main>
        </div>
      </ErrorBoundary>
    </AuthErrorBoundary>
  );
}

export function MentorDashboard({ user }: MentorDashboardProps) {
  const [mentorData, setMentorData] = useState<MentorApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentorData = async () => {
      try {
        const response = await fetch('/api/mentors/application');
        const result = await response.json();
        if (result.success) {
          setMentorData(result.data as MentorApplication);
        }
      } catch (error) {
        console.error('Error fetching mentor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMentorData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!mentorData) {
    return <div>Error loading mentor data.</div>;
  }

  const verificationStatus = mentorData.verificationStatus;

  if (verificationStatus !== 'VERIFIED') {
    return <NonVerifiedMentorView mentor={mentorData} status={verificationStatus} userName={user?.name} />;
  }

  return (
    <AuthErrorBoundary>
      <ErrorBoundary>
        <div className='min-h-screen bg-gray-50'>
          <SidebarProvider defaultOpen={true}>
            <div className='flex min-h-screen w-full'>
              <SidebarInset className='flex flex-col flex-1'>
                <Header />
                <main className='flex-1 p-6'>
                  <div className='space-y-6'>
                    <div>
                      <h1 className='text-3xl font-bold text-gray-900'>Mentor Dashboard</h1>
                      <p className='text-gray-600'>Welcome back, {user?.name}!</p>
                    </div>

                    <div className='grid grid-cols-1 gap-6 md:grid-cols-4'>
                      <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                          <CardTitle className='text-sm font-medium'>Active Mentees</CardTitle>
                          <Users className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold'>5</div>
                          <p className='text-xs text-muted-foreground'>+2 this month</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                          <CardTitle className='text-sm font-medium'>Sessions This Week</CardTitle>
                          <Calendar className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold'>8</div>
                          <p className='text-xs text-muted-foreground'>+12% from last week</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                          <CardTitle className='text-sm font-medium'>Messages</CardTitle>
                          <MessageSquare className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold'>23</div>
                          <p className='text-xs text-muted-foreground'>3 unread</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                          <CardTitle className='text-sm font-medium'>Rating</CardTitle>
                          <CheckCircle className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold'>4.9</div>
                          <p className='text-xs text-muted-foreground'>Based on 47 reviews</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                      <Card>
                        <CardHeader>
                          <CardTitle>Upcoming Sessions</CardTitle>
                          <CardDescription>Your next mentoring sessions</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className='text-sm text-muted-foreground'>No upcoming sessions scheduled</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Messages</CardTitle>
                          <CardDescription>Latest messages from mentees</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className='text-sm text-muted-foreground'>No new messages</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </div>
      </ErrorBoundary>
    </AuthErrorBoundary>
  );
}
