'use client';

import type { ReactNode } from 'react';

import { getDashboardShellClassNames, getDashboardShellMode } from '@/lib/dashboard/shell-mode';

interface DashboardSectionFrameProps {
  section: string | null | undefined;
  children: ReactNode;
}

export function DashboardSectionFrame({
  section,
  children,
}: DashboardSectionFrameProps) {
  const shellMode = getDashboardShellMode(section);
  const shellClasses = getDashboardShellClassNames(shellMode);

  if (!shellClasses.section) {
    return <>{children}</>;
  }

  return (
    <div
      data-testid='dashboard-section-frame'
      data-shell-mode={shellMode}
      className={shellClasses.section}
    >
      {children}
    </div>
  );
}
