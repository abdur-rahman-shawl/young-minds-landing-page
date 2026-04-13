'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  buildDashboardSectionUrl,
  type DashboardRouteBasePath,
} from '@/lib/dashboard/sections';
import {
  MENTOR_FEATURE_DEFINITIONS,
  type MentorFeatureAccessDecision,
  type MentorFeatureKey,
} from '@/lib/mentor/access-policy';
import { cn } from '@/lib/utils';

type MentorVerificationStatus =
  | 'YET_TO_APPLY'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVERIFICATION'
  | 'RESUBMITTED'
  | 'UPDATED_PROFILE'
  | 'UNKNOWN';

interface MentorVerificationProfile {
  verificationStatus?: string | null;
  verificationNotes?: string | null;
}

interface MentorVerificationStatusMeta {
  status: MentorVerificationStatus;
  label: string;
  shortLabel: string;
  sidebarHint: string;
  headline: string;
  description: string;
  badgeClassName: string;
  iconClassName: string;
  panelClassName: string;
  borderClassName: string;
  icon: LucideIcon;
}

interface MentorVerificationAction {
  href: string;
  label: string;
}

interface MentorFeatureRestrictionMeta {
  badgeKind: 'verification' | 'custom';
  badgeLabel?: string;
  badgeClassName?: string;
  badgeDotClassName?: string;
  headline: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  panelClassName: string;
  borderClassName: string;
  action: MentorVerificationAction | null;
  showVerificationNotes: boolean;
}

const STATUS_META: Record<MentorVerificationStatus, Omit<MentorVerificationStatusMeta, 'status'>> = {
  YET_TO_APPLY: {
    label: 'Application not started',
    shortLabel: 'Setup required',
    sidebarHint: 'Complete your mentor application to unlock bookings.',
    headline: 'Finish your mentor application to unlock the workspace',
    description:
      'Your mentor profile still needs the required information before review can begin.',
    badgeClassName:
      'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
    iconClassName:
      'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
    panelClassName:
      'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
    borderClassName:
      'border-slate-200/80 dark:border-slate-800',
    icon: FileText,
  },
  IN_PROGRESS: {
    label: 'Verification pending',
    shortLabel: 'Under review',
    sidebarHint: 'Our team is reviewing your mentor profile.',
    headline: 'Verification is in progress',
    description:
      'Your mentor application is with our review team. Access opens automatically once it is approved.',
    badgeClassName:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    iconClassName:
      'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950',
    panelClassName:
      'from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950/25',
    borderClassName:
      'border-amber-200/80 dark:border-amber-900/50',
    icon: Clock3,
  },
  VERIFIED: {
    label: 'Verified mentor',
    shortLabel: 'Verified',
    sidebarHint: 'Your mentor profile is approved and bookable.',
    headline: 'Your mentor workspace is fully active',
    description:
      'Your verification is complete and all mentor operations are available.',
    badgeClassName:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    iconClassName:
      'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950',
    panelClassName:
      'from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20',
    borderClassName:
      'border-emerald-200/80 dark:border-emerald-900/40',
    icon: ShieldCheck,
  },
  REJECTED: {
    label: 'Application not approved',
    shortLabel: 'Not approved',
    sidebarHint: 'Review the notes and submit an updated application.',
    headline: 'Your current application was not approved',
    description:
      'Use the review notes below to prepare a stronger resubmission and continue onboarding.',
    badgeClassName:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    iconClassName:
      'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
    panelClassName:
      'from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/20',
    borderClassName:
      'border-rose-200/80 dark:border-rose-900/40',
    icon: XCircle,
  },
  REVERIFICATION: {
    label: 'Reverification required',
    shortLabel: 'Action needed',
    sidebarHint: 'A few updates are needed before approval.',
    headline: 'We need a few updates before activation',
    description:
      'Your application needs additional information or corrections before it can be approved.',
    badgeClassName:
      'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
    iconClassName:
      'bg-orange-500 text-white dark:bg-orange-400 dark:text-slate-950',
    panelClassName:
      'from-orange-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-orange-950/25',
    borderClassName:
      'border-orange-200/80 dark:border-orange-900/50',
    icon: RefreshCw,
  },
  RESUBMITTED: {
    label: 'Resubmitted for review',
    shortLabel: 'Resubmitted',
    sidebarHint: 'Your updated application is back in review.',
    headline: 'Your updated application is back under review',
    description:
      'We have received your latest updates and are reviewing them now.',
    badgeClassName:
      'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    iconClassName:
      'bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950',
    panelClassName:
      'from-sky-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/20',
    borderClassName:
      'border-sky-200/80 dark:border-sky-900/40',
    icon: RefreshCw,
  },
  UPDATED_PROFILE: {
    label: 'Profile update submitted',
    shortLabel: 'Updates submitted',
    sidebarHint: 'Recent profile changes are awaiting review.',
    headline: 'Your latest profile changes are pending review',
    description:
      'Recent updates to your mentor profile are waiting for approval before they go live.',
    badgeClassName:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    iconClassName:
      'bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-950',
    panelClassName:
      'from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20',
    borderClassName:
      'border-blue-200/80 dark:border-blue-900/40',
    icon: RefreshCw,
  },
  UNKNOWN: {
    label: 'Status unavailable',
    shortLabel: 'Check status',
    sidebarHint: 'Refresh your profile or contact support.',
    headline: 'We could not determine your verification state',
    description:
      'Refresh your mentor profile data or contact support if this status continues.',
    badgeClassName:
      'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
    iconClassName:
      'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
    panelClassName:
      'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
    borderClassName:
      'border-slate-200/80 dark:border-slate-800',
    icon: AlertTriangle,
  },
};

function normalizeMentorVerificationStatus(
  status: string | null | undefined
): MentorVerificationStatus {
  if (!status) {
    return 'YET_TO_APPLY';
  }

  switch (status) {
    case 'YET_TO_APPLY':
    case 'IN_PROGRESS':
    case 'VERIFIED':
    case 'REJECTED':
    case 'REVERIFICATION':
    case 'RESUBMITTED':
    case 'UPDATED_PROFILE':
      return status;
    default:
      return 'UNKNOWN';
  }
}

export function getMentorVerificationStatusMeta(
  status: string | null | undefined
): MentorVerificationStatusMeta {
  const normalizedStatus = normalizeMentorVerificationStatus(status);

  return {
    status: normalizedStatus,
    ...STATUS_META[normalizedStatus],
  };
}

export function getMentorVerificationPrimaryAction(
  status: string | null | undefined,
  routeBasePath: DashboardRouteBasePath
): MentorVerificationAction | null {
  const normalizedStatus = normalizeMentorVerificationStatus(status);

  switch (normalizedStatus) {
    case 'YET_TO_APPLY':
      return {
        href: '/become-expert',
        label: 'Complete application',
      };
    case 'REJECTED':
    case 'REVERIFICATION':
      return {
        href: '/become-expert',
        label: 'Update application',
      };
    case 'IN_PROGRESS':
    case 'RESUBMITTED':
    case 'UPDATED_PROFILE':
      return {
        href: buildDashboardSectionUrl(routeBasePath, 'profile'),
        label: 'Review profile',
      };
    default:
      return null;
  }
}

export function MentorVerificationBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const meta = getMentorVerificationStatusMeta(status);

  return (
    <Badge
      variant='outline'
      className={cn('gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium', meta.badgeClassName, className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.iconClassName)} />
      {meta.shortLabel}
    </Badge>
  );
}

function getMentorFeatureRestrictionMeta(
  access: MentorFeatureAccessDecision | null | undefined,
  mentorProfile: MentorVerificationProfile | null | undefined,
  routeBasePath: DashboardRouteBasePath
): MentorFeatureRestrictionMeta {
  const verificationMeta = getMentorVerificationStatusMeta(
    mentorProfile?.verificationStatus
  );
  const verificationAction = getMentorVerificationPrimaryAction(
    mentorProfile?.verificationStatus,
    routeBasePath
  );

  switch (access?.reasonCode) {
    case 'payment_required':
      return {
        badgeKind: 'custom',
        badgeLabel: 'Payment pending',
        badgeClassName:
          'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
        badgeDotClassName:
          'bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-950',
        headline: 'Complete mentor activation to unlock this workspace',
        description:
          'Operational mentor features stay locked until the onboarding payment is completed.',
        icon: CreditCard,
        iconClassName:
          'bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-950',
        panelClassName:
          'from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20',
        borderClassName: 'border-blue-200/80 dark:border-blue-900/40',
        action: {
          href: buildDashboardSectionUrl(routeBasePath, 'subscription'),
          label: 'Complete activation',
        },
        showVerificationNotes: false,
      };
    case 'subscription_required':
    case 'feature_not_in_plan':
      return {
        badgeKind: 'custom',
        badgeLabel: 'Plan required',
        badgeClassName:
          'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-200',
        badgeDotClassName:
          'bg-fuchsia-500 text-white dark:bg-fuchsia-400 dark:text-slate-950',
        headline: 'Your mentor plan does not include this feature',
        description:
          'Upgrade or change the mentor subscription to unlock this feature.',
        icon: Sparkles,
        iconClassName:
          'bg-fuchsia-500 text-white dark:bg-fuchsia-400 dark:text-slate-950',
        panelClassName:
          'from-fuchsia-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-950 dark:to-fuchsia-950/20',
        borderClassName: 'border-fuchsia-200/80 dark:border-fuchsia-900/40',
        action: {
          href: buildDashboardSectionUrl(routeBasePath, 'subscription'),
          label: 'View plans',
        },
        showVerificationNotes: false,
      };
    case 'account_inactive':
    case 'account_blocked':
      return {
        badgeKind: 'custom',
        badgeLabel: 'Account restricted',
        badgeClassName:
          'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
        badgeDotClassName:
          'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
        headline: 'This account cannot access mentor operations right now',
        description:
          'Account restrictions are preventing access to this feature.',
        icon: AlertTriangle,
        iconClassName:
          'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
        panelClassName:
          'from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/20',
        borderClassName: 'border-rose-200/80 dark:border-rose-900/40',
        action: null,
        showVerificationNotes: false,
      };
    case 'status_unavailable':
    case 'subscription_unavailable':
      return {
        badgeKind: 'custom',
        badgeLabel: 'Status unavailable',
        badgeClassName:
          'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        badgeDotClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
        headline: 'We could not verify access for this feature',
        description:
          'Refresh the workspace or retry later if this continues.',
        icon: AlertTriangle,
        iconClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
        panelClassName:
          'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        borderClassName: 'border-slate-200/80 dark:border-slate-800',
        action: null,
        showVerificationNotes: false,
      };
    case 'mentor_role_required':
      return {
        badgeKind: 'custom',
        badgeLabel: 'Mentor access',
        badgeClassName:
          'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        badgeDotClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
        headline: 'Mentor access is required for this feature',
        description:
          'This workspace area is reserved for mentor accounts.',
        icon: Lock,
        iconClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
        panelClassName:
          'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        borderClassName: 'border-slate-200/80 dark:border-slate-800',
        action: null,
        showVerificationNotes: false,
      };
    default:
      return {
        badgeKind: 'verification',
        headline: verificationMeta.headline,
        description: verificationMeta.description,
        icon: verificationMeta.icon,
        iconClassName: verificationMeta.iconClassName,
        panelClassName: verificationMeta.panelClassName,
        borderClassName: verificationMeta.borderClassName,
        action: verificationAction,
        showVerificationNotes: true,
      };
  }
}

export function MentorVerificationNotice({
  mentorProfile,
  routeBasePath,
  className,
}: {
  mentorProfile: MentorVerificationProfile | null | undefined;
  routeBasePath: DashboardRouteBasePath;
  className?: string;
}) {
  const meta = getMentorVerificationStatusMeta(mentorProfile?.verificationStatus);
  const action = getMentorVerificationPrimaryAction(
    mentorProfile?.verificationStatus,
    routeBasePath
  );
  const StatusIcon = meta.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden border shadow-sm',
        meta.borderClassName,
        className
      )}
    >
      <CardContent
        className={cn(
          'flex flex-col gap-4 bg-gradient-to-r p-5 md:flex-row md:items-center md:justify-between',
          meta.panelClassName
        )}
      >
        <div className='flex items-start gap-4'>
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
              meta.iconClassName
            )}
          >
            <StatusIcon className='h-5 w-5' />
          </div>
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
                Mentor access
              </span>
              <MentorVerificationBadge status={mentorProfile?.verificationStatus} />
            </div>
            <div>
              <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                {meta.headline}
              </p>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
                {meta.sidebarHint}
              </p>
            </div>
            {mentorProfile?.verificationNotes && (
              <p className='max-w-3xl rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300'>
                <span className='font-medium text-slate-900 dark:text-slate-100'>
                  Review notes:
                </span>{' '}
                {mentorProfile.verificationNotes}
              </p>
            )}
          </div>
        </div>

        {action && (
          <Button asChild className='h-10 shrink-0 rounded-xl px-4'>
            <Link href={action.href}>
              {action.label}
              <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function MentorVerificationGate({
  access,
  mentorProfile,
  routeBasePath,
  userName,
  featureName,
  featureSummary,
  capabilities,
  className,
}: {
  access?: MentorFeatureAccessDecision | null;
  mentorProfile: MentorVerificationProfile | null | undefined;
  routeBasePath: DashboardRouteBasePath;
  userName?: string | null;
  featureName: string;
  featureSummary: string;
  capabilities: string[];
  className?: string;
}) {
  const restrictionMeta = getMentorFeatureRestrictionMeta(
    access,
    mentorProfile,
    routeBasePath
  );
  const profileHref = buildDashboardSectionUrl(routeBasePath, 'profile');
  const showProfileShortcut =
    Boolean(mentorProfile) && restrictionMeta.action?.href !== profileHref;
  const StatusIcon = restrictionMeta.icon;
  const firstName = userName?.trim().split(' ')[0] || 'Mentor';

  return (
    <div className={cn('mx-auto w-full max-w-6xl', className)}>
      <Card
        className={cn(
          'overflow-hidden border shadow-xl shadow-slate-200/50 dark:shadow-black/20',
          restrictionMeta.borderClassName
        )}
      >
        <div className='grid gap-0 xl:grid-cols-[1.5fr_0.9fr]'>
          <CardContent
            className={cn(
              'relative overflow-hidden bg-gradient-to-br p-8 sm:p-10',
              restrictionMeta.panelClassName
            )}
          >
            <div className='absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.85),transparent_70%)] xl:block dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_70%)]' />
            <div className='relative max-w-3xl space-y-6'>
              <div className='flex flex-wrap items-center gap-3'>
                <span className='text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400'>
                  Mentor access
                </span>
                {restrictionMeta.badgeKind === 'verification' ? (
                  <MentorVerificationBadge status={mentorProfile?.verificationStatus} />
                ) : (
                  <Badge
                    variant='outline'
                    className={cn(
                      'gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                      restrictionMeta.badgeClassName
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        restrictionMeta.badgeDotClassName
                      )}
                    />
                    {restrictionMeta.badgeLabel}
                  </Badge>
                )}
              </div>

              <div className='flex flex-col gap-5 sm:flex-row sm:items-start'>
                <div
                  className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl shadow-lg',
                    restrictionMeta.iconClassName
                  )}
                >
                  <StatusIcon className='h-7 w-7' />
                </div>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-slate-600 dark:text-slate-300'>
                      Hi {firstName},
                    </p>
                    <h1 className='text-3xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                      {restrictionMeta.headline}
                    </h1>
                    <p className='max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300'>
                      {featureName} is currently locked. {featureSummary}{' '}
                      {restrictionMeta.description}
                    </p>
                  </div>

                  {restrictionMeta.showVerificationNotes &&
                    mentorProfile?.verificationNotes && (
                    <div className='rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/75'>
                      <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                        Review notes
                      </p>
                      <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                        {mentorProfile.verificationNotes}
                      </p>
                    </div>
                    )}

                  <div className='flex flex-col gap-3 sm:flex-row'>
                    {restrictionMeta.action && (
                      <Button asChild size='lg' className='rounded-xl px-6'>
                        <Link href={restrictionMeta.action.href}>
                          {restrictionMeta.action.label}
                          <ArrowRight className='ml-2 h-4 w-4' />
                        </Link>
                      </Button>
                    )}
                    {showProfileShortcut && (
                      <Button
                        asChild
                        variant='outline'
                        size='lg'
                        className='rounded-xl px-6'
                      >
                        <Link href={profileHref}>Open profile</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardContent className='flex flex-col justify-between bg-slate-950 p-8 text-white dark:bg-slate-900'>
            <div className='space-y-6'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-slate-300'>
                  <Lock className='h-4 w-4' />
                  <span className='text-sm font-medium'>
                    {restrictionMeta.badgeKind === 'verification'
                      ? 'Locked until approval'
                      : 'Feature currently locked'}
                  </span>
                </div>
                <h2 className='text-xl font-semibold tracking-tight'>
                  {restrictionMeta.badgeKind === 'verification'
                    ? 'What unlocks after verification'
                    : 'What unlocks here'}
                </h2>
              </div>

              <div className='space-y-3'>
                {capabilities.map((capability) => (
                  <div
                    key={capability}
                    className='flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3'
                  >
                    <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-300' />
                    <p className='text-sm leading-6 text-slate-200'>{capability}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

export function MentorFeaturePageGate({
  feature,
  access,
  mentorProfile,
  routeBasePath,
  userName,
  className,
}: {
  feature: MentorFeatureKey;
  access?: MentorFeatureAccessDecision | null;
  mentorProfile: MentorVerificationProfile | null | undefined;
  routeBasePath: DashboardRouteBasePath;
  userName?: string | null;
  className?: string;
}) {
  const definition = MENTOR_FEATURE_DEFINITIONS[feature];

  return (
    <MentorVerificationGate
      access={access}
      mentorProfile={mentorProfile}
      routeBasePath={routeBasePath}
      userName={userName}
      featureName={definition.label}
      featureSummary={definition.blockedSummary}
      capabilities={definition.capabilities}
      className={className}
    />
  );
}

export function MentorFeatureCardGate({
  feature,
  access,
  mentorProfile,
  routeBasePath,
  className,
}: {
  feature: MentorFeatureKey;
  access: MentorFeatureAccessDecision | null | undefined;
  mentorProfile: MentorVerificationProfile | null | undefined;
  routeBasePath: DashboardRouteBasePath;
  className?: string;
}) {
  const definition = MENTOR_FEATURE_DEFINITIONS[feature];
  const restrictionMeta = getMentorFeatureRestrictionMeta(
    access,
    mentorProfile,
    routeBasePath
  );
  const StatusIcon = restrictionMeta.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden border shadow-sm',
        restrictionMeta.borderClassName,
        className
      )}
    >
      <CardContent
        className={cn(
          'flex h-full flex-col justify-between gap-5 bg-gradient-to-br p-5',
          restrictionMeta.panelClassName
        )}
      >
        <div className='space-y-4'>
          <div className='flex items-start gap-3'>
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
                restrictionMeta.iconClassName
              )}
            >
              <StatusIcon className='h-5 w-5' />
            </div>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
                  Restricted feature
                </span>
                {restrictionMeta.badgeKind === 'verification' ? (
                  <MentorVerificationBadge status={mentorProfile?.verificationStatus} />
                ) : (
                  <Badge
                    variant='outline'
                    className={cn(
                      'gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                      restrictionMeta.badgeClassName
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        restrictionMeta.badgeDotClassName
                      )}
                    />
                    {restrictionMeta.badgeLabel}
                  </Badge>
                )}
              </div>
              <div>
                <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  {definition.label}
                </p>
                <p className='mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                  {access?.blockedSummary ?? definition.blockedSummary}
                </p>
              </div>
            </div>
          </div>

          {restrictionMeta.showVerificationNotes &&
            mentorProfile?.verificationNotes && (
            <p className='rounded-2xl border border-white/70 bg-white/80 px-3.5 py-3 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300'>
              <span className='font-medium text-slate-900 dark:text-slate-100'>
                Review notes:
              </span>{' '}
              {mentorProfile.verificationNotes}
            </p>
          )}
        </div>

        <div className='space-y-3'>
          <div className='space-y-2'>
            {definition.capabilities.slice(0, 2).map((capability) => (
              <div
                key={capability}
                className='flex items-start gap-2 rounded-2xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300'
              >
                <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-300' />
                <span>{capability}</span>
              </div>
            ))}
          </div>

          {restrictionMeta.action && (
            <Button asChild variant='outline' className='w-full justify-between rounded-xl'>
              <Link href={restrictionMeta.action.href}>
                {restrictionMeta.action.label}
                <ArrowRight className='h-4 w-4' />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
