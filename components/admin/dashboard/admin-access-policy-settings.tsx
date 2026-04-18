'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CircleHelp,
  Database,
  GitBranch,
  Layers3,
  Loader2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  type AdminAccessPolicyConfig,
  type AdminAccessPolicyOverrides,
  useAdminAccessPolicyConfigQuery,
  useAdminPublishAccessPolicyDraftMutation,
  useAdminResetAccessPolicyDraftMutation,
  useAdminUpsertAccessPolicyDraftMutation,
} from '@/hooks/queries/use-admin-queries';
import {
  ACCESS_POLICY_AXIS_DEFINITIONS,
  type AccessPolicyAudience,
  type AccessPolicyAxisDefinition,
  type AccessPolicyAxisKey,
} from '@/lib/access-policy/lifecycle-model';
import {
  MENTEE_FEATURE_DEFINITIONS,
  MENTEE_FEATURE_KEYS,
  type MenteeFeatureKey,
} from '@/lib/mentee/access-policy';
import {
  MENTOR_FEATURE_DEFINITIONS,
  MENTOR_FEATURE_KEYS,
  type MentorFeatureKey,
} from '@/lib/mentor/access-policy';

const BASELINE_OPTION = '__baseline__';

type PolicyOverridesTree = {
  mentor?: {
    features?: Record<string, Record<string, Record<string, string>>>;
  };
  mentee?: {
    features?: Record<string, Record<string, Record<string, string>>>;
  };
};

type RuntimeConfig = AdminAccessPolicyConfig['baseline'];

interface FeatureGroupDefinition {
  key: string;
  label: string;
  description: string;
}

interface FeatureGroupMatch extends FeatureGroupDefinition {
  features: FeatureEditorDefinition[];
  totalFeatures: number;
}

interface FeatureEditorDefinition {
  audience: AccessPolicyAudience;
  key: string;
  label: string;
  summary: string;
  blockedSummary: string;
  capabilities: string[];
  axes: AccessPolicyAxisKey[];
  subscriptionBacked: boolean;
  groupKey: string;
}

interface PolicyRuleDefinition {
  label: string;
  description: string;
}

const RULE_DEFINITIONS: Record<string, PolicyRuleDefinition> = {
  ok: {
    label: 'Allow access',
    description: 'The feature remains available for this lifecycle state.',
  },
  authentication_required: {
    label: 'Require sign-in',
    description: 'The user must authenticate before the feature is available.',
  },
  account_inactive: {
    label: 'Block inactive account',
    description: 'The account exists, but it is not active enough to use the feature.',
  },
  account_blocked: {
    label: 'Block restricted account',
    description: 'The feature stays blocked because the account is restricted.',
  },
  account_state_unavailable: {
    label: 'Fail closed on account uncertainty',
    description: 'The system blocks access when account lifecycle facts cannot be proven safely.',
  },
  application_required: {
    label: 'Require mentor application',
    description: 'The mentor must submit the verification application first.',
  },
  verification_pending: {
    label: 'Hold pending review',
    description: 'The feature stays blocked until verification review finishes.',
  },
  action_required: {
    label: 'Require mentor action',
    description: 'The mentor must correct or resubmit something before access is restored.',
  },
  not_approved: {
    label: 'Block rejected state',
    description: 'The feature remains blocked because the application was not approved.',
  },
  payment_required: {
    label: 'Require activation payment',
    description: 'The feature stays blocked until the mentor activation payment is completed.',
  },
  subscription_required: {
    label: 'Require subscription',
    description: 'No active subscription exists for the audience required by this feature.',
  },
  feature_not_in_plan: {
    label: 'Feature not in plan',
    description: 'A subscription exists, but the current plan does not include the feature.',
  },
  subscription_unavailable: {
    label: 'Fail closed on entitlement uncertainty',
    description: 'The system blocks access when subscription entitlement resolution is unavailable.',
  },
  status_unavailable: {
    label: 'Fail closed on status uncertainty',
    description: 'The system blocks access when the lifecycle state is unknown or untrusted.',
  },
};

const AUDIENCE_GROUPS = {
  mentor: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      description:
        'Top-level mentor widgets and home-surface visibility inside the dashboard.',
    },
    {
      key: 'operations',
      label: 'Operations',
      description:
        'Core delivery work such as mentees, schedules, availability, and review execution.',
    },
    {
      key: 'workspace',
      label: 'Workspace',
      description:
        'Communication, profile maintenance, and subscription-management surfaces mentors use day to day.',
    },
    {
      key: 'growth',
      label: 'Growth',
      description:
        'Scale and monetization surfaces such as analytics, recordings, and content publishing.',
    },
  ],
  mentee: [
    {
      key: 'discovery',
      label: 'Discovery',
      description:
        'Finding mentors and browsing courses before deeper learning workflows begin.',
    },
    {
      key: 'learning',
      label: 'Learning',
      description:
        'Active study, AI help, recordings, analytics, and session-related mentee experiences.',
    },
    {
      key: 'communication',
      label: 'Communication',
      description:
        'Mailbox access, direct messaging, and request-based conversation flows.',
    },
    {
      key: 'account',
      label: 'Account',
      description:
        'Profile and subscription-management surfaces that control the user workspace.',
    },
  ],
} as const satisfies Record<
  AccessPolicyAudience,
  readonly FeatureGroupDefinition[]
>;

const AUDIENCE_DESCRIPTIONS: Record<
  AccessPolicyAudience,
  {
    title: string;
    description: string;
    baselineDescription: string;
    decisionOrder: AccessPolicyAxisKey[];
  }
> = {
  mentor: {
    title: 'Mentor capability matrix',
    description:
      'Mentor access can be shaped by account lifecycle, verification, activation payment, and subscription state. The first blocking rule in that order wins.',
    baselineDescription:
      'Baseline means the hard-coded mentor behavior the app already had before runtime policy overrides existed.',
    decisionOrder: ['account', 'verification', 'payment', 'subscription'],
  },
  mentee: {
    title: 'Mentee capability matrix',
    description:
      'Mentee access is simpler: the engine checks account lifecycle first and subscription state second. The first blocking rule wins.',
    baselineDescription:
      'Baseline means the hard-coded mentee behavior the app already had before runtime policy overrides existed.',
    decisionOrder: ['account', 'subscription'],
  },
};

const MENTOR_FEATURE_GROUP_KEYS: Record<MentorFeatureKey, string> = {
  [MENTOR_FEATURE_KEYS.dashboardStats]: 'dashboard',
  [MENTOR_FEATURE_KEYS.dashboardSessions]: 'dashboard',
  [MENTOR_FEATURE_KEYS.dashboardReviews]: 'dashboard',
  [MENTOR_FEATURE_KEYS.dashboardMessages]: 'dashboard',
  [MENTOR_FEATURE_KEYS.dashboardProfile]: 'dashboard',
  [MENTOR_FEATURE_KEYS.menteesView]: 'operations',
  [MENTOR_FEATURE_KEYS.scheduleManage]: 'operations',
  [MENTOR_FEATURE_KEYS.availabilityManage]: 'operations',
  [MENTOR_FEATURE_KEYS.reviewsManage]: 'operations',
  [MENTOR_FEATURE_KEYS.messagesView]: 'workspace',
  [MENTOR_FEATURE_KEYS.directMessages]: 'workspace',
  [MENTOR_FEATURE_KEYS.messageRequests]: 'workspace',
  [MENTOR_FEATURE_KEYS.profileManage]: 'workspace',
  [MENTOR_FEATURE_KEYS.subscriptionManage]: 'workspace',
  [MENTOR_FEATURE_KEYS.analyticsView]: 'growth',
  [MENTOR_FEATURE_KEYS.recordingsView]: 'growth',
  [MENTOR_FEATURE_KEYS.contentManage]: 'growth',
};

const MENTEE_FEATURE_GROUP_KEYS: Record<MenteeFeatureKey, string> = {
  [MENTEE_FEATURE_KEYS.mentorDirectoryView]: 'discovery',
  [MENTEE_FEATURE_KEYS.coursesBrowse]: 'discovery',
  [MENTEE_FEATURE_KEYS.learningWorkspace]: 'learning',
  [MENTEE_FEATURE_KEYS.analyticsView]: 'learning',
  [MENTEE_FEATURE_KEYS.recordingsView]: 'learning',
  [MENTEE_FEATURE_KEYS.aiChatUse]: 'learning',
  [MENTEE_FEATURE_KEYS.sessionsView]: 'learning',
  [MENTEE_FEATURE_KEYS.messagesView]: 'communication',
  [MENTEE_FEATURE_KEYS.directMessages]: 'communication',
  [MENTEE_FEATURE_KEYS.messageRequests]: 'communication',
  [MENTEE_FEATURE_KEYS.profileManage]: 'account',
  [MENTEE_FEATURE_KEYS.subscriptionManage]: 'account',
};

const MENTOR_POLICY_FEATURES: FeatureEditorDefinition[] = Object.values(
  MENTOR_FEATURE_KEYS
).map((featureKey) => {
  const definition =
    MENTOR_FEATURE_DEFINITIONS[featureKey as MentorFeatureKey];

  return {
    audience: 'mentor',
    key: featureKey,
    label: definition.label,
    summary: definition.capabilities[0] ?? definition.blockedSummary,
    blockedSummary: definition.blockedSummary,
    capabilities: definition.capabilities,
    axes: [
      'account',
      'verification',
      'payment',
      ...(definition.subscriptionFeatureKey
        ? (['subscription'] as const)
        : []),
    ],
    subscriptionBacked: Boolean(definition.subscriptionFeatureKey),
    groupKey: MENTOR_FEATURE_GROUP_KEYS[featureKey as MentorFeatureKey],
  };
});

const MENTEE_POLICY_FEATURES: FeatureEditorDefinition[] = Object.values(
  MENTEE_FEATURE_KEYS
).map((featureKey) => {
  const definition =
    MENTEE_FEATURE_DEFINITIONS[featureKey as MenteeFeatureKey];

  return {
    audience: 'mentee',
    key: featureKey,
    label: definition.label,
    summary: definition.capabilities[0] ?? definition.blockedSummary,
    blockedSummary: definition.blockedSummary,
    capabilities: definition.capabilities,
    axes: [
      'account',
      ...(definition.subscriptionFeatureKey
        ? (['subscription'] as const)
        : []),
    ],
    subscriptionBacked: Boolean(definition.subscriptionFeatureKey),
    groupKey: MENTEE_FEATURE_GROUP_KEYS[featureKey as MenteeFeatureKey],
  };
});

function cloneOverrides(
  overrides: AdminAccessPolicyOverrides | null | undefined
): PolicyOverridesTree {
  if (!overrides) {
    return {};
  }

  return JSON.parse(JSON.stringify(overrides)) as PolicyOverridesTree;
}

function stringifyOverrides(
  overrides: AdminAccessPolicyOverrides | null | undefined
) {
  return JSON.stringify(overrides ?? {});
}

function countOverrideLeaves(value: unknown): number {
  if (typeof value === 'string') {
    return 1;
  }

  if (!value || typeof value !== 'object') {
    return 0;
  }

  return Object.values(value).reduce(
    (total, child) => total + countOverrideLeaves(child),
    0
  );
}

function formatVersionLabel(
  row: AdminAccessPolicyConfig['draft'] | AdminAccessPolicyConfig['published']
) {
  if (!row) {
    return 'None';
  }

  return `v${row.version}`;
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return 'Not published';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getAudienceFeatures(audience: AccessPolicyAudience) {
  return audience === 'mentor' ? MENTOR_POLICY_FEATURES : MENTEE_POLICY_FEATURES;
}

function getAudienceGroups(audience: AccessPolicyAudience) {
  return AUDIENCE_GROUPS[audience];
}

function getAxisDefinition(
  audience: AccessPolicyAudience,
  axisKey: AccessPolicyAxisKey
): AccessPolicyAxisDefinition {
  const axisDefinitions = ACCESS_POLICY_AXIS_DEFINITIONS[audience] as Partial<
    Record<AccessPolicyAxisKey, AccessPolicyAxisDefinition>
  >;
  const definition = axisDefinitions[axisKey];

  if (!definition) {
    throw new Error(`Unsupported ${audience} access-policy axis: ${axisKey}`);
  }

  return definition;
}

function getAxisLabel(audience: AccessPolicyAudience, axisKey: AccessPolicyAxisKey) {
  return getAxisDefinition(audience, axisKey).label;
}

function formatFallbackLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getRuleDefinition(ruleCode: string | null | undefined): PolicyRuleDefinition {
  if (!ruleCode) {
    return {
      label: 'Not set',
      description: 'No explicit rule is stored for this cell.',
    };
  }

  return (
    RULE_DEFINITIONS[ruleCode] ?? {
      label: formatFallbackLabel(ruleCode),
      description: 'This rule code is available, but no custom explanation was provided in the editor.',
    }
  );
}

function getStateDefinition(
  axisDefinition: AccessPolicyAxisDefinition,
  state: string
) {
  return (
    axisDefinition.states.find((candidate) => candidate.state === state) ?? null
  );
}

function getRuntimePolicyCell(
  runtimeConfig: RuntimeConfig | null | undefined,
  audience: AccessPolicyAudience,
  featureKey: string,
  axisKey: AccessPolicyAxisKey,
  state: string
) {
  const audienceConfig = runtimeConfig?.[audience];
  const features = audienceConfig?.features as
    | Record<string, Record<string, Record<string, string> | undefined>>
    | undefined;
  const featureMatrix = features?.[featureKey];

  return featureMatrix?.[axisKey]?.[state] ?? null;
}

function getOverridePolicyCell(
  overrides: AdminAccessPolicyOverrides | null | undefined,
  audience: AccessPolicyAudience,
  featureKey: string,
  axisKey: AccessPolicyAxisKey,
  state: string
) {
  const tree = overrides as PolicyOverridesTree | null | undefined;

  return tree?.[audience]?.features?.[featureKey]?.[axisKey]?.[state] ?? null;
}

function updatePolicyOverride(
  overrides: AdminAccessPolicyOverrides | null | undefined,
  audience: AccessPolicyAudience,
  featureKey: string,
  axisKey: AccessPolicyAxisKey,
  state: string,
  nextRuleCode: string
): AdminAccessPolicyOverrides {
  const next = cloneOverrides(overrides);

  if (nextRuleCode !== BASELINE_OPTION) {
    const audienceNode = (next[audience] ??= {});
    const features = (audienceNode.features ??= {});
    const featureNode = (features[featureKey] ??= {});
    const axisNode = (featureNode[axisKey] ??= {});
    axisNode[state] = nextRuleCode;

    return next as AdminAccessPolicyOverrides;
  }

  const axisNode = next[audience]?.features?.[featureKey]?.[axisKey];
  if (!axisNode) {
    return next as AdminAccessPolicyOverrides;
  }

  delete axisNode[state];

  const featureNode = next[audience]?.features?.[featureKey];
  if (featureNode && Object.keys(featureNode[axisKey] ?? {}).length === 0) {
    delete featureNode[axisKey];
  }

  const features = next[audience]?.features;
  if (features?.[featureKey] && Object.keys(features[featureKey]).length === 0) {
    delete features[featureKey];
  }

  if (features && Object.keys(features).length === 0) {
    delete next[audience]?.features;
  }

  if (next[audience] && Object.keys(next[audience] ?? {}).length === 0) {
    delete next[audience];
  }

  return next as AdminAccessPolicyOverrides;
}

function groupFeaturesByAudience(
  audience: AccessPolicyAudience
): FeatureGroupMatch[] {
  const features = getAudienceFeatures(audience);

  return getAudienceGroups(audience).map((group) => ({
    ...group,
    features: features.filter((feature) => feature.groupKey === group.key),
    totalFeatures: features.filter((feature) => feature.groupKey === group.key)
      .length,
  }));
}

function normalizeSearchQuery(value: string) {
  return value.trim().toLowerCase();
}

function buildFeatureSearchText(
  audience: AccessPolicyAudience,
  group: FeatureGroupDefinition,
  feature: FeatureEditorDefinition
) {
  const axisLabels = feature.axes
    .map((axisKey) => getAxisLabel(audience, axisKey))
    .join(' ');

  return [
    group.label,
    group.description,
    feature.label,
    feature.key,
    feature.summary,
    feature.blockedSummary,
    axisLabels,
    ...feature.capabilities,
  ]
    .join(' ')
    .toLowerCase();
}

function filterFeatureGroups(
  audience: AccessPolicyAudience,
  searchQuery: string
): FeatureGroupMatch[] {
  const groups = groupFeaturesByAudience(audience);

  if (!searchQuery) {
    return groups;
  }

  return groups
    .map((group) => {
      const groupText = `${group.label} ${group.description}`.toLowerCase();
      if (groupText.includes(searchQuery)) {
        return group;
      }

      const features = group.features.filter((feature) =>
        buildFeatureSearchText(audience, group, feature).includes(searchQuery)
      );

      return {
        ...group,
        features,
      };
    })
    .filter((group) => group.features.length > 0);
}

function getVisibleFeatureKeys(groups: FeatureGroupMatch[]) {
  return groups.flatMap((group) => group.features.map((feature) => feature.key));
}

function mergeAccordionValues(
  existingValues: string[],
  scopedValues: string[],
  nextScopedValues: string[]
) {
  const preserved = existingValues.filter((value) => !scopedValues.includes(value));
  return [...preserved, ...nextScopedValues];
}

function InfoTooltip({
  title,
  description,
  lines = [],
}: {
  title: string;
  description: string;
  lines?: readonly string[];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
        >
          <CircleHelp className="h-3.5 w-3.5" />
          <span className="sr-only">{title}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm border-slate-200 bg-white p-3 text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{title}</p>
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>
          {lines.length > 0 ? (
            <div className="space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
              {lines.map((line) => (
                <p key={line} className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function PolicyOutcomePreview({
  title,
  ruleCode,
}: {
  title: string;
  ruleCode: string | null | undefined;
}) {
  const definition = getRuleDefinition(ruleCode);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {title}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-950 dark:text-slate-100">
          {definition.label}
        </span>
        {ruleCode ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            {ruleCode}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {definition.description}
      </p>
    </div>
  );
}

function MatrixPrimer({
  audience,
  featureCount,
  groupCount,
  overrideCount,
  onApplyBaselinePreset,
}: {
  audience: AccessPolicyAudience;
  featureCount: number;
  groupCount: number;
  overrideCount: number;
  onApplyBaselinePreset: () => void;
}) {
  const audienceDefinition = AUDIENCE_DESCRIPTIONS[audience];
  const decisionExample =
    audience === 'mentor'
      ? 'Example: if a mentor is blocked at the account axis, the engine never reaches verification, payment, or subscription for that feature. The earlier block wins.'
      : 'Example: if a mentee is blocked at the account axis, the engine never reaches subscription for that feature. The earlier block wins.';

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
              {audienceDefinition.title}
            </Badge>
            <Badge variant="outline">{featureCount} features</Badge>
            <Badge variant="outline">{groupCount} groups</Badge>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {audienceDefinition.description}
          </p>
        </div>

        <Card className="min-w-[280px] border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-950/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Current app baseline</CardTitle>
              <InfoTooltip
                title="Current app baseline"
                description={audienceDefinition.baselineDescription}
                lines={[
                  'Applying this preset stages zero runtime overrides.',
                  'Nothing becomes live until you save the draft and publish it.',
                ]}
              />
            </div>
            <CardDescription className="text-xs leading-5">
              Use this when you want the runtime matrix to fall back to the
              existing code-defined behavior instead of custom policy cells.
              This clears local overrides across both tabs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              Local editor state currently contains {overrideCount} override cell
              {overrideCount === 1 ? '' : 's'} across both tabs.
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={onApplyBaselinePreset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Stage Baseline Preset
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-950/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">How to read the matrix</CardTitle>
              <InfoTooltip
                title="How to read the matrix"
                description="Each access decision is made by walking the feature card from lifecycle state to policy outcome."
                lines={[
                  'Tab: choose mentor or mentee.',
                  'Group: business area used to reduce scanning.',
                  'Feature card: one capability or surface in the app.',
                  'Axis card: one dimension that can block access.',
                  'State row: the exact lifecycle fact being matched.',
                  'Outcome: what the app should do when that state occurs.',
                ]}
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {[
              {
                label: '1. Feature',
                description: 'Pick the capability you are editing.',
              },
              {
                label: '2. Axis',
                description: 'Find the lifecycle dimension that can affect it.',
              },
              {
                label: '3. State',
                description: 'Match the real user state such as blocked or in review.',
              },
              {
                label: '4. Outcome',
                description: 'Choose allow, block, or safe fail behavior for that state.',
              },
            ].map((step, index, items) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {step.label}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">
                    {step.description}
                  </p>
                </div>
                {index < items.length - 1 ? (
                  <ArrowRight className="mt-3 hidden h-4 w-4 text-slate-400 dark:text-slate-600 lg:block" />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-950/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Decision order</CardTitle>
              <InfoTooltip
                title="Decision order"
                description="The engine checks these axes in order. The first blocking result becomes the final decision."
                lines={audienceDefinition.decisionOrder.map((axisKey, index) => {
                  const axisLabel = getAxisLabel(audience, axisKey);
                  return `${index + 1}. ${axisLabel}`;
                })}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {audienceDefinition.decisionOrder.map((axisKey, index) => (
                <div key={axisKey} className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white px-3 py-1 dark:bg-slate-900">
                    {getAxisLabel(audience, axisKey)}
                  </Badge>
                  {index < audienceDefinition.decisionOrder.length - 1 ? (
                    <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              {decisionExample}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PolicyCellEditor({
  axisDefinition,
  audience,
  featureKey,
  state,
  baseline,
  effective,
  overrides,
  onChange,
}: {
  axisDefinition: AccessPolicyAxisDefinition;
  audience: AccessPolicyAudience;
  featureKey: string;
  state: string;
  baseline: string | null;
  effective: string | null;
  overrides: AdminAccessPolicyOverrides;
  onChange: (nextOverrides: AdminAccessPolicyOverrides) => void;
}) {
  const stateDefinition = getStateDefinition(axisDefinition, state);
  const stateLabel = stateDefinition?.label ?? formatFallbackLabel(state);
  const stateDescription =
    stateDefinition?.description ??
    'This row runs when the engine resolves this lifecycle state.';
  const override = getOverridePolicyCell(
    overrides,
    audience,
    featureKey,
    axisDefinition.key,
    state
  );
  const previewEffective = override ?? effective ?? baseline;
  const selectedRuleCode = override ?? BASELINE_OPTION;
  const selectedRuleDefinition = getRuleDefinition(
    override ?? effective ?? baseline
  );

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/70">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              {stateLabel}
            </span>
            {stateLabel !== state ? (
              <Badge variant="outline" className="font-mono text-[10px]">
                {state}
              </Badge>
            ) : null}
            <InfoTooltip
              title={stateLabel}
              description={stateDescription}
              lines={[
                `Axis: ${axisDefinition.label}`,
                'This row only affects the current feature and current audience tab.',
              ]}
            />
            {override ? (
              <Badge className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Override
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                Baseline
              </Badge>
            )}
          </div>
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{stateDescription}</p>
        </div>

        <div className="space-y-2">
          <Select
            value={selectedRuleCode}
            onValueChange={(value) =>
              onChange(
                updatePolicyOverride(
                  overrides,
                  audience,
                  featureKey,
                  axisDefinition.key,
                  state,
                  value
                )
              )
            }
          >
            <SelectTrigger className="h-10 bg-white text-left text-xs dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="Select policy result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BASELINE_OPTION}>
                Use baseline: {getRuleDefinition(baseline).label}
              </SelectItem>
              {axisDefinition.ruleCodes.map((ruleCode) => (
                <SelectItem key={ruleCode} value={ruleCode}>
                  {getRuleDefinition(ruleCode).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Selected outcome: <span className="font-medium text-slate-900 dark:text-slate-100">{selectedRuleDefinition.label}</span>
            {' — '}
            {selectedRuleDefinition.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PolicyOutcomePreview title="Baseline" ruleCode={baseline} />
        <PolicyOutcomePreview title="Effective preview" ruleCode={previewEffective} />
      </div>
    </div>
  );
}

function PolicyAxisEditor({
  audience,
  featureKey,
  axisKey,
  baseline,
  effective,
  overrides,
  onChange,
}: {
  audience: AccessPolicyAudience;
  featureKey: string;
  axisKey: AccessPolicyAxisKey;
  baseline: RuntimeConfig;
  effective: RuntimeConfig;
  overrides: AdminAccessPolicyOverrides;
  onChange: (nextOverrides: AdminAccessPolicyOverrides) => void;
}) {
  const axisDefinition = getAxisDefinition(audience, axisKey);

  return (
    <Card className="border-slate-200 bg-slate-50/70 shadow-none dark:border-slate-800 dark:bg-slate-900/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{axisDefinition.label}</CardTitle>
              <InfoTooltip
                title={axisDefinition.label}
                description={axisDefinition.description}
                lines={axisDefinition.states.map(
                  (stateDefinition) =>
                    `${stateDefinition.label}: ${stateDefinition.description}`
                )}
              />
            </div>
            <CardDescription className="text-xs leading-5">
              {axisDefinition.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-white dark:bg-slate-900">
            {axisDefinition.states.length} states
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {axisDefinition.states.map((stateDefinition) => (
          <PolicyCellEditor
            key={stateDefinition.state}
            axisDefinition={axisDefinition}
            audience={audience}
            featureKey={featureKey}
            state={stateDefinition.state}
            baseline={getRuntimePolicyCell(
              baseline,
              audience,
              featureKey,
              axisKey,
              stateDefinition.state
            )}
            effective={getRuntimePolicyCell(
              effective,
              audience,
              featureKey,
              axisKey,
              stateDefinition.state
            )}
            overrides={overrides}
            onChange={onChange}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PolicyFeatureEditor({
  feature,
  baseline,
  effective,
  overrides,
  onChange,
}: {
  feature: FeatureEditorDefinition;
  baseline: RuntimeConfig;
  effective: RuntimeConfig;
  overrides: AdminAccessPolicyOverrides;
  onChange: (nextOverrides: AdminAccessPolicyOverrides) => void;
}) {
  const decisionOrder = AUDIENCE_DESCRIPTIONS[feature.audience].decisionOrder
    .filter((axisKey) => feature.axes.includes(axisKey))
    .map((axisKey) => getAxisLabel(feature.audience, axisKey))
    .join(' -> ');

  return (
    <AccordionItem
      value={feature.key}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70"
    >
      <AccordionTrigger className="px-4 py-4 text-left hover:no-underline">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{feature.label}</CardTitle>
              <InfoTooltip
                title={feature.label}
                description={feature.blockedSummary}
                lines={[
                  `Feature key: ${feature.key}`,
                  `Decision order in scope: ${decisionOrder}`,
                  ...feature.capabilities.map((capability) => `Capability: ${capability}`),
                ]}
              />
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.summary}</p>
            <CardDescription className="font-mono text-xs">
              {feature.key}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            {feature.axes.map((axisKey) => (
              <Badge key={axisKey} variant="outline" className="bg-white dark:bg-slate-900">
                {getAxisLabel(feature.audience, axisKey)}
              </Badge>
            ))}
            {feature.subscriptionBacked ? (
              <Badge variant="outline" className="bg-white dark:bg-slate-900">
                Subscription-backed
              </Badge>
            ) : null}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-4 pt-1">
        {feature.axes.map((axisKey) => (
          <PolicyAxisEditor
            key={axisKey}
            audience={feature.audience}
            featureKey={feature.key}
            axisKey={axisKey}
            baseline={baseline}
            effective={effective}
            overrides={overrides}
            onChange={onChange}
          />
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}

function PolicyFeatureGroups({
  audience,
  baseline,
  effective,
  overrides,
  searchValue,
  onSearchValueChange,
  expandedGroupKeys,
  onExpandedGroupKeysChange,
  expandedFeatureKeys,
  onExpandedFeatureKeysChange,
  onChange,
}: {
  audience: AccessPolicyAudience;
  baseline: RuntimeConfig;
  effective: RuntimeConfig;
  overrides: AdminAccessPolicyOverrides;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  expandedGroupKeys: string[];
  onExpandedGroupKeysChange: (value: string[]) => void;
  expandedFeatureKeys: string[];
  onExpandedFeatureKeysChange: (value: string[]) => void;
  onChange: (nextOverrides: AdminAccessPolicyOverrides) => void;
}) {
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchQuery = normalizeSearchQuery(deferredSearchValue);
  const groups = useMemo(
    () => filterFeatureGroups(audience, normalizedSearchQuery),
    [audience, normalizedSearchQuery]
  );
  const totalFeatureCount = useMemo(
    () =>
      groupFeaturesByAudience(audience).reduce(
        (total, group) => total + group.totalFeatures,
        0
      ),
    [audience]
  );
  const visibleFeatureCount = groups.reduce(
    (total, group) => total + group.features.length,
    0
  );
  const visibleGroupKeys = groups.map((group) => group.key);
  const visibleFeatureKeys = getVisibleFeatureKeys(groups);
  const searchActive = normalizedSearchQuery.length > 0;
  const resolvedGroupKeys = searchActive ? visibleGroupKeys : expandedGroupKeys;

  const handleExpandVisible = () => {
    onExpandedGroupKeysChange(visibleGroupKeys);
    onExpandedFeatureKeysChange(visibleFeatureKeys);
  };

  const handleCollapseAll = () => {
    onExpandedGroupKeysChange([]);
    onExpandedFeatureKeysChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              placeholder={`Search ${audience} features, keys, groups, or descriptions`}
              className="h-11 border-slate-200 bg-white pl-10 pr-11 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => onSearchValueChange('')}
                className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExpandVisible}
              disabled={visibleFeatureCount === 0 || searchActive}
            >
              Expand Visible
            </Button>
            <Button
              variant="outline"
              onClick={handleCollapseAll}
              disabled={
                searchActive ||
                (expandedGroupKeys.length === 0 && expandedFeatureKeys.length === 0)
              }
            >
              Collapse All
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Badge variant="outline">
            Showing {visibleFeatureCount} of {totalFeatureCount} features
          </Badge>
          <Badge variant="outline">
            {groups.length} of {getAudienceGroups(audience).length} groups
          </Badge>
          {searchActive ? (
            <span className="text-slate-500 dark:text-slate-400">
              Search automatically opens matching groups and features.
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Groups and features stay collapsed until you open them.
            </span>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/60">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            No matching policy features found
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try a broader search term such as dashboard, messaging, verification,
            analytics, or subscription.
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={resolvedGroupKeys}
          onValueChange={(value) => {
            if (!searchActive) {
              onExpandedGroupKeysChange(value);
            }
          }}
          className="space-y-4"
        >
          {groups.map((group) => {
            const groupFeatureKeys = group.features.map((feature) => feature.key);
            const resolvedFeatureKeys = searchActive
              ? groupFeatureKeys
              : expandedFeatureKeys.filter((key) => groupFeatureKeys.includes(key));

            return (
              <AccordionItem
                key={group.key}
                value={group.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <div className="space-y-2 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                        {group.label}
                      </span>
                      <Badge variant="outline">
                        {group.features.length} feature
                        {group.features.length === 1 ? '' : 's'}
                        {group.features.length !== group.totalFeatures
                          ? ` matched of ${group.totalFeatures}`
                          : ''}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {group.description}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-1">
                  <Accordion
                    type="multiple"
                    value={resolvedFeatureKeys}
                    onValueChange={(value) => {
                      if (!searchActive) {
                        onExpandedFeatureKeysChange(
                          mergeAccordionValues(
                            expandedFeatureKeys,
                            groupFeatureKeys,
                            value
                          )
                        );
                      }
                    }}
                    className="space-y-3"
                  >
                    {group.features.map((feature) => (
                      <PolicyFeatureEditor
                        key={feature.key}
                        feature={feature}
                        baseline={baseline}
                        effective={effective}
                        overrides={overrides}
                        onChange={onChange}
                      />
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

export function AdminAccessPolicySettings() {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useAdminAccessPolicyConfigQuery();
  const upsertDraftMutation = useAdminUpsertAccessPolicyDraftMutation();
  const publishDraftMutation = useAdminPublishAccessPolicyDraftMutation();
  const resetDraftMutation = useAdminResetAccessPolicyDraftMutation();
  const [overrides, setOverrides] = useState<AdminAccessPolicyOverrides>({});
  const [notes, setNotes] = useState('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [searchByAudience, setSearchByAudience] = useState<
    Record<AccessPolicyAudience, string>
  >({
    mentor: '',
    mentee: '',
  });
  const [expandedGroupKeysByAudience, setExpandedGroupKeysByAudience] =
    useState<Record<AccessPolicyAudience, string[]>>({
      mentor: [],
      mentee: [],
    });
  const [expandedFeatureKeysByAudience, setExpandedFeatureKeysByAudience] =
    useState<Record<AccessPolicyAudience, string[]>>({
      mentor: [],
      mentee: [],
    });

  const sourceOverrides = useMemo(
    () => data?.draft?.overrides ?? data?.published?.overrides ?? {},
    [data?.draft?.overrides, data?.published?.overrides]
  );
  const sourceNotes = data?.draft?.notes ?? '';
  const effectiveConfig =
    data?.draft?.effective ?? data?.published?.effective ?? data?.baseline;
  const overrideCount = countOverrideLeaves(overrides);
  const hasChanges =
    stringifyOverrides(overrides) !== stringifyOverrides(sourceOverrides) ||
    notes.trim() !== sourceNotes;

  useEffect(() => {
    if (!data) {
      return;
    }

    setOverrides(cloneOverrides(data.draft?.overrides ?? data.published?.overrides));
    setNotes(data.draft?.notes ?? '');
  }, [
    data?.draft?.id,
    data?.draft?.updatedAt,
    data?.published?.id,
    data?.published?.updatedAt,
  ]);

  const handleSaveDraft = async () => {
    try {
      await upsertDraftMutation.mutateAsync({
        overrides,
        notes: notes.trim() || null,
      });
      toast({
        title: 'Access policy draft saved',
        description: 'The draft is validated and ready to publish.',
      });
    } catch (mutationError) {
      toast({
        title: 'Failed to save access policy draft',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Unexpected policy save error',
        variant: 'destructive',
      });
    }
  };

  const handlePublishDraft = async () => {
    try {
      await publishDraftMutation.mutateAsync();
      setShowPublishDialog(false);
      toast({
        title: 'Access policy published',
        description: 'The published policy is now the runtime source of truth.',
      });
    } catch (mutationError) {
      toast({
        title: 'Failed to publish access policy',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Unexpected policy publish error',
        variant: 'destructive',
      });
    }
  };

  const handleResetDraft = async (source: 'published' | 'baseline') => {
    try {
      await resetDraftMutation.mutateAsync({ source });
      toast({
        title: 'Access policy draft reset',
        description:
          source === 'baseline'
            ? 'The draft now matches the current app baseline.'
            : 'The draft now matches the current published policy.',
      });
    } catch (mutationError) {
      toast({
        title: 'Failed to reset access policy draft',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Unexpected policy reset error',
        variant: 'destructive',
      });
    }
  };

  const handleStageBaselinePreset = () => {
    setOverrides({});
    toast({
      title: 'Baseline preset staged',
      description:
        'The editor now reflects the original code-defined app behavior with no runtime overrides.',
      duration: 2500,
    });
  };

  const updateSearchValue = (audience: AccessPolicyAudience, value: string) => {
    setSearchByAudience((current) => ({
      ...current,
      [audience]: value,
    }));
  };

  const updateExpandedGroupKeys = (
    audience: AccessPolicyAudience,
    value: string[]
  ) => {
    setExpandedGroupKeysByAudience((current) => ({
      ...current,
      [audience]: value,
    }));
  };

  const updateExpandedFeatureKeys = (
    audience: AccessPolicyAudience,
    value: string[]
  ) => {
    setExpandedFeatureKeysByAudience((current) => ({
      ...current,
      [audience]: value,
    }));
  };

  if (isLoading || !data || !effectiveConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load access policy';

    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{message}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 dark:bg-slate-950/70">
          <CardHeader className="border-b bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc,_#ffffff)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.12),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))]">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                    Runtime matrix
                  </Badge>
                  <Badge variant="outline">
                    Published {formatVersionLabel(data.published)}
                  </Badge>
                  <Badge variant="outline">
                    Draft {formatVersionLabel(data.draft)}
                  </Badge>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">Access Policy Matrix</CardTitle>
                    <InfoTooltip
                      title="Access Policy Matrix"
                      description="This screen controls validated access outcomes for known lifecycle states. It does not invent new business logic."
                      lines={[
                        'Baseline: the existing code-defined app behavior.',
                        'Override: a draft or published change to one matrix cell.',
                        'Effective: the outcome the app would currently use at runtime.',
                      ]}
                    />
                  </div>
                  <CardDescription className="max-w-3xl">
                    Configure validated outcomes for known lifecycle states.
                    The code baseline remains the original app behavior; runtime
                    overrides become active only after you save and publish them.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleResetDraft('published')}
                  disabled={resetDraftMutation.isPending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Published
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleResetDraft('baseline')}
                  disabled={resetDraftMutation.isPending}
                >
                  <GitBranch className="mr-2 h-4 w-4" />
                  Reset to Baseline
                </Button>
                <Button
                  onClick={() => void handleSaveDraft()}
                  disabled={!hasChanges || upsertDraftMutation.isPending}
                >
                  {upsertDraftMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Draft
                </Button>
                <Button
                  className="bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                  disabled={!data.draft || publishDraftMutation.isPending}
                  onClick={() => setShowPublishDialog(true)}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Publish Draft
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Database className="h-3.5 w-3.5" />
                  Source
                </div>
                <p className="mt-1 text-sm font-medium">
                  {data.published ? 'Published config' : 'Code baseline'}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Layers3 className="h-3.5 w-3.5" />
                  Overrides
                </div>
                <p className="mt-1 text-sm font-medium">{overrideCount} cells</p>
              </div>
              <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Published
                </div>
                <p className="mt-1 text-sm font-medium">
                  {formatDateLabel(data.published?.publishedAt)}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Baseline preset
                </div>
                <p className="mt-1 text-sm font-medium">
                  Original app behavior
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Stages zero overrides and restores code-defined policy behavior.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-policy-notes">Draft notes</Label>
              <Textarea
                id="access-policy-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                placeholder="Explain why this access-policy override is needed."
                className="min-h-[108px] bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Notes are stored with the draft and audit trail. Keep them
                operational, not conversational.
              </p>
            </div>
          </CardContent>
        </Card>

        {hasChanges ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Unsaved draft changes exist. Save the draft first, then publish it to
            make the matrix active at runtime.
          </div>
        ) : null}

        <Tabs defaultValue="mentor" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mentor">Mentor policy</TabsTrigger>
            <TabsTrigger value="mentee">Mentee policy</TabsTrigger>
          </TabsList>

          {(['mentor', 'mentee'] as const).map((audience) => {
            const groupedFeatures = groupFeaturesByAudience(audience);
            const featureCount = groupedFeatures.reduce(
              (total, group) => total + group.features.length,
              0
            );

            return (
              <TabsContent key={audience} value={audience} className="space-y-4">
                <MatrixPrimer
                  audience={audience}
                  featureCount={featureCount}
                  groupCount={groupedFeatures.length}
                  overrideCount={overrideCount}
                  onApplyBaselinePreset={handleStageBaselinePreset}
                />

                <PolicyFeatureGroups
                  audience={audience}
                  baseline={data.baseline}
                  effective={effectiveConfig}
                  overrides={overrides}
                  searchValue={searchByAudience[audience]}
                  onSearchValueChange={(value) =>
                    updateSearchValue(audience, value)
                  }
                  expandedGroupKeys={expandedGroupKeysByAudience[audience]}
                  onExpandedGroupKeysChange={(value) =>
                    updateExpandedGroupKeys(audience, value)
                  }
                  expandedFeatureKeys={expandedFeatureKeysByAudience[audience]}
                  onExpandedFeatureKeysChange={(value) =>
                    updateExpandedFeatureKeys(audience, value)
                  }
                  onChange={setOverrides}
                />
              </TabsContent>
            );
          })}
        </Tabs>

        <AlertDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish access policy draft?</AlertDialogTitle>
              <AlertDialogDescription>
                Publishing makes this draft the runtime policy source for all
                users. The previous published version is archived and the action
                is audit-logged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Separator />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Current draft: {formatVersionLabel(data.draft)} with {overrideCount}{' '}
              override cell(s).
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handlePublishDraft();
                }}
              >
                {publishDraftMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Publish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
