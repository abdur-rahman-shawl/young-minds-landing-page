import { cn } from '@/lib/utils';
import {
  DASHBOARD_SECTIONS,
  type DashboardShellMode,
  getDashboardSection,
} from '@/lib/dashboard/sections';

export const DASHBOARD_WORKSPACE_SECTIONS = DASHBOARD_SECTIONS.filter(
  (section) => section.shellMode === 'workspace'
).map((section) => section.key);

export function getDashboardShellMode(
  section: string | null | undefined
): DashboardShellMode {
  const definition = getDashboardSection(section);
  if (!definition) {
    return 'page';
  }

  return definition.shellMode;
}

export function isDashboardWorkspaceSection(
  section: string | null | undefined
): boolean {
  return getDashboardShellMode(section) === 'workspace';
}

export function getDashboardShellClassNames(mode: DashboardShellMode) {
  const isWorkspace = mode === 'workspace';

  return {
    shell: cn(isWorkspace ? 'h-svh overflow-hidden' : 'min-h-screen'),
    inset: cn(isWorkspace && 'h-svh overflow-hidden'),
    main: cn(isWorkspace && 'overflow-hidden'),
    content: cn(isWorkspace && 'min-h-0 overflow-hidden'),
    section: cn(
      isWorkspace && 'flex h-full min-h-0 flex-1 overflow-hidden'
    ),
  };
}
