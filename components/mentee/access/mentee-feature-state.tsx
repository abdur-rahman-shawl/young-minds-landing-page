'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Lock,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  buildDashboardSectionUrl,
  type DashboardRouteBasePath,
} from '@/lib/dashboard/sections';
import {
  MENTEE_FEATURE_DEFINITIONS,
  type MenteeFeatureAccessDecision,
  type MenteeFeatureKey,
} from '@/lib/mentee/access-policy';
import { cn } from '@/lib/utils';

interface MenteeFeatureGateMeta {
  label: string;
  headline: string;
  description: string;
  icon: LucideIcon;
  panelClassName: string;
  borderClassName: string;
  iconClassName: string;
  action:
    | {
        href: string;
        label: string;
      }
    | null;
}

function getMenteeFeatureGateMeta(
  access: MenteeFeatureAccessDecision | null | undefined,
  routeBasePath: DashboardRouteBasePath
): MenteeFeatureGateMeta {
  switch (access?.reasonCode) {
    case 'subscription_required':
    case 'feature_not_in_plan':
      return {
        label: 'Subscription required',
        headline: 'Your current mentee plan does not unlock this workspace',
        description:
          'Upgrade or change the mentee subscription to access this feature.',
        icon: Sparkles,
        panelClassName:
          'from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20',
        borderClassName: 'border-blue-200/80 dark:border-blue-900/40',
        iconClassName:
          'bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-950',
        action: {
          href: buildDashboardSectionUrl(routeBasePath, 'subscription'),
          label: 'Manage subscription',
        },
      };
    case 'account_inactive':
    case 'account_blocked':
      return {
        label: 'Account restricted',
        headline: 'This workspace is unavailable for the current account',
        description:
          'Account restrictions are preventing access to this feature right now.',
        icon: AlertTriangle,
        panelClassName:
          'from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/20',
        borderClassName: 'border-rose-200/80 dark:border-rose-900/40',
        iconClassName:
          'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
        action: null,
      };
    case 'subscription_unavailable':
      return {
        label: 'Status unavailable',
        headline: 'We could not verify subscription access',
        description:
          'Refresh the page or retry later if this continues.',
        icon: AlertTriangle,
        panelClassName:
          'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        borderClassName: 'border-slate-200/80 dark:border-slate-800',
        iconClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
        action: null,
      };
    case 'mentee_role_required':
    default:
      return {
        label: 'Restricted feature',
        headline: 'This feature is not currently available',
        description:
          'The selected workspace section is not available for the current account.',
        icon: Lock,
        panelClassName:
          'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        borderClassName: 'border-slate-200/80 dark:border-slate-800',
        iconClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
        action: null,
      };
  }
}

export function MenteeFeaturePageGate({
  feature,
  access,
  routeBasePath,
  className,
}: {
  feature: MenteeFeatureKey;
  access: MenteeFeatureAccessDecision | null | undefined;
  routeBasePath: DashboardRouteBasePath;
  className?: string;
}) {
  const definition = MENTEE_FEATURE_DEFINITIONS[feature];
  const meta = getMenteeFeatureGateMeta(access, routeBasePath);
  const StatusIcon = meta.icon;

  return (
    <div className={cn('mx-auto w-full max-w-5xl', className)}>
      <Card
        className={cn(
          'overflow-hidden border shadow-xl shadow-slate-200/50 dark:shadow-black/20',
          meta.borderClassName
        )}
      >
        <div className='grid gap-0 xl:grid-cols-[1.45fr_0.85fr]'>
          <CardContent
            className={cn(
              'bg-gradient-to-br p-8 sm:p-10',
              meta.panelClassName
            )}
          >
            <div className='max-w-3xl space-y-6'>
              <div className='space-y-2'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400'>
                  {meta.label}
                </p>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl shadow-lg',
                      meta.iconClassName
                    )}
                  >
                    <StatusIcon className='h-7 w-7' />
                  </div>
                  <div className='space-y-3'>
                    <h1 className='text-3xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                      {meta.headline}
                    </h1>
                    <p className='text-base leading-7 text-slate-600 dark:text-slate-300'>
                      {definition.label} is currently locked. {definition.blockedSummary}{' '}
                      {meta.description}
                    </p>
                  </div>
                </div>
              </div>

              {meta.action && (
                <Button asChild size='lg' className='rounded-xl px-6'>
                  <Link href={meta.action.href}>
                    {meta.action.label}
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>

          <CardContent className='flex flex-col justify-between bg-slate-950 p-8 text-white dark:bg-slate-900'>
            <div className='space-y-6'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-slate-300'>
                  <BookOpen className='h-4 w-4' />
                  <span className='text-sm font-medium'>What unlocks here</span>
                </div>
                <h2 className='text-xl font-semibold tracking-tight'>
                  Feature coverage
                </h2>
              </div>

              <div className='space-y-3'>
                {definition.capabilities.map((capability) => (
                  <div
                    key={capability}
                    className='rounded-2xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-slate-200'
                  >
                    {capability}
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
