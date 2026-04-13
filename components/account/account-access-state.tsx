'use client';

import { AlertTriangle, Ban, ShieldAlert } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { AccountAccessPolicySnapshot } from '@/lib/access-policy/account';
import { cn } from '@/lib/utils';

function getAccountStateMeta(accountAccess: AccountAccessPolicySnapshot) {
  switch (accountAccess.reasonCode) {
    case 'account_blocked':
      return {
        label: 'Account restricted',
        headline: 'This account is currently restricted',
        description:
          'Workspace access has been disabled for this account. Contact support if you need the restriction reviewed.',
        icon: Ban,
        panelClassName:
          'from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/25',
        borderClassName: 'border-rose-200/80 dark:border-rose-900/40',
        iconClassName:
          'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
      };
    case 'account_inactive':
      return {
        label: 'Account inactive',
        headline: 'This account is inactive',
        description:
          'Reactivate the account before continuing. Until then, protected workspace features stay locked.',
        icon: ShieldAlert,
        panelClassName:
          'from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950/25',
        borderClassName: 'border-amber-200/80 dark:border-amber-900/40',
        iconClassName:
          'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950',
      };
    default:
      return {
        label: 'Account status unavailable',
        headline: 'We could not verify your account status',
        description:
          'Refresh the session or contact support if this state continues.',
        icon: AlertTriangle,
        panelClassName:
          'from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        borderClassName: 'border-slate-200/80 dark:border-slate-800',
        iconClassName:
          'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950',
      };
  }
}

export function AccountAccessPageGate({
  accountAccess,
  className,
}: {
  accountAccess: AccountAccessPolicySnapshot;
  className?: string;
}) {
  const meta = getAccountStateMeta(accountAccess);
  const StatusIcon = meta.icon;

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-[#0B0D13]',
        className
      )}
    >
      <Card
        className={cn(
          'w-full max-w-3xl overflow-hidden border shadow-xl shadow-slate-200/50 dark:shadow-black/20',
          meta.borderClassName
        )}
      >
        <CardContent
          className={cn(
            'bg-gradient-to-br p-8 sm:p-10',
            meta.panelClassName
          )}
        >
          <div className='mx-auto max-w-2xl space-y-6 text-center'>
            <div
              className={cn(
                'mx-auto flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg',
                meta.iconClassName
              )}
            >
              <StatusIcon className='h-7 w-7' />
            </div>

            <div className='space-y-3'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400'>
                {meta.label}
              </p>
              <h1 className='text-3xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                {meta.headline}
              </h1>
              <p className='text-base leading-7 text-slate-600 dark:text-slate-300'>
                {meta.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
