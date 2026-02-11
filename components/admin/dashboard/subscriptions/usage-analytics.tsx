'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type AudienceFilter = 'all' | 'mentor' | 'mentee';

interface AnalyticsOverview {
  totalEvents: number;
  uniqueActiveUsers: number;
  featuresAtLimit: number;
  limitBreachCount: number;
}

interface UsageByFeatureItem {
  featureKey: string;
  featureName: string;
  unit: string | null;
  totalUsage: number;
  averageLimit: number;
}

interface UsageOverTimeItem {
  date: string;
  eventCount: number;
  uniqueUsers: number;
}

interface LimitBreachItem {
  userName: string;
  userEmail: string;
  featureName: string;
  featureKey: string;
  usageCount: number;
  limitCount: number;
  limitReachedAt: string | null;
}

interface PlanDistributionItem {
  planName: string;
  planKey: string;
  audience: 'mentor' | 'mentee';
  activeCount: number;
}

interface TopConsumerItem {
  userName: string;
  userEmail: string;
  totalEvents: number;
  totalCount: number;
  totalMinutes: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  usageByFeature: UsageByFeatureItem[];
  usageOverTime: UsageOverTimeItem[];
  limitBreaches: LimitBreachItem[];
  planDistribution: PlanDistributionItem[];
  topConsumers: TopConsumerItem[];
}

interface AnalyticsApiResponse {
  success: boolean;
  data?: AnalyticsData;
  error?: string;
}

const usageByFeatureChartConfig = {
  usage: {
    label: 'Usage',
    color: 'hsl(var(--chart-1))',
  },
  limit: {
    label: 'Limit',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const usageOverTimeChartConfig = {
  eventCount: {
    label: 'Events',
    color: 'hsl(var(--chart-1))',
  },
  uniqueUsers: {
    label: 'Unique Users',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const planDistributionChartConfig = {
  activeCount: {
    label: 'Active Subscriptions',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function toLabelText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function truncateLabel(value: unknown, maxLength = 25) {
  const text = toLabelText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDateAxis(value: unknown) {
  const text = toLabelText(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function UsageAnalytics() {
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(defaults.startDate);
  const [endDate, setEndDate] = useState<string>(defaults.endDate);
  const [audience, setAudience] = useState<AudienceFilter>('all');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        audience,
      });

      const response = await fetch(`/api/admin/subscriptions/analytics?${params.toString()}`, {
        credentials: 'include',
      });

      const payload = (await response.json()) as AnalyticsApiResponse;
      if (!response.ok || !payload.success || !payload.data) {
        const message = payload.error || 'Failed to load usage analytics';
        setError(message);
        toast.error(message);
        return;
      }

      setData(payload.data);
    } catch (requestError) {
      console.error('Failed to load usage analytics:', requestError);
      setError('Failed to load usage analytics');
      toast.error('Failed to load usage analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, audience]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const usageByFeatureChartData = useMemo(
    () =>
      [...(data?.usageByFeature || [])]
        .sort((a, b) => b.totalUsage - a.totalUsage)
        .slice(0, 10)
        .map((item) => ({
          featureName: item.featureName,
          usage: item.totalUsage,
          limit: item.averageLimit,
          unit: item.unit,
        })),
    [data]
  );

  const usageOverTimeChartData = useMemo(
    () =>
      (data?.usageOverTime || []).map((item) => ({
        ...item,
        label: formatDateAxis(item.date),
      })),
    [data]
  );

  const planDistributionChartData = useMemo(
    () =>
      (data?.planDistribution || []).map((item) => ({
        planName: item.planName,
        activeCount: item.activeCount,
      })),
    [data]
  );

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Failed to Load Analytics
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadAnalytics}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const analytics = data;
  if (!analytics) {
    return null;
  }

  const noData = analytics.overview.totalEvents === 0;
  const kpiCards = [
    {
      title: 'Total Events',
      value: analytics.overview.totalEvents,
      icon: Activity,
    },
    {
      title: 'Active Users',
      value: analytics.overview.uniqueActiveUsers,
      icon: Users,
    },
    {
      title: 'Limit Breaches',
      value: analytics.overview.limitBreachCount,
      icon: AlertTriangle,
    },
    {
      title: 'Features at Limit',
      value: analytics.overview.featuresAtLimit,
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
          <CardDescription>
            Track feature consumption, plan distribution, and limit breaches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="usage-start-date">Start Date</Label>
              <Input
                id="usage-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage-end-date">End Date</Label>
              <Input
                id="usage-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(value) => setAudience(value as AudienceFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mentor">Mentors</SelectItem>
                  <SelectItem value="mentee">Mentees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2 lg:flex lg:items-end">
              <Button className="w-full lg:w-auto" onClick={loadAnalytics} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {noData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No usage data for this period.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
              <CardDescription>Top 10 features by usage volume.</CardDescription>
            </CardHeader>
            <CardContent>
              {usageByFeatureChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feature usage in this range.</p>
              ) : (
                <ChartContainer config={usageByFeatureChartConfig} className="h-[320px] w-full">
                  <BarChart data={usageByFeatureChartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="featureName"
                      width={200}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => truncateLabel(value)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="var(--color-usage)" radius={4} />
                    <Bar dataKey="limit" fill="var(--color-limit)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
              <CardDescription>Daily events and unique users for the selected window.</CardDescription>
            </CardHeader>
            <CardContent>
              {usageOverTimeChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline data in this range.</p>
              ) : (
                <ChartContainer config={usageOverTimeChartConfig} className="h-[320px] w-full">
                  <AreaChart data={usageOverTimeChartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      tickFormatter={(value) => formatDateAxis(value)}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) =>
                            new Date(value as string).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="eventCount"
                      stroke="var(--color-eventCount)"
                      fill="var(--color-eventCount)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="uniqueUsers"
                      stroke="var(--color-uniqueUsers)"
                      fill="var(--color-uniqueUsers)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Active and trialing subscriptions by plan.</CardDescription>
              </CardHeader>
              <CardContent>
                {planDistributionChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active subscriptions in this range.</p>
                ) : (
                  <ChartContainer config={planDistributionChartConfig} className="h-[320px] w-full">
                    <BarChart data={planDistributionChartData} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="planName"
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                        tickFormatter={(value) => truncateLabel(value, 20)}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="activeCount" fill="var(--color-activeCount)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limit Breaches</CardTitle>
                <CardDescription>Top 20 users currently at or beyond feature limits.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Feature</th>
                        <th className="px-4 py-3 font-medium">Usage / Limit</th>
                        <th className="px-4 py-3 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.limitBreaches.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                            No limit breaches found.
                          </td>
                        </tr>
                      ) : (
                        analytics.limitBreaches.slice(0, 20).map((item, index) => (
                          <tr key={`${item.userEmail}-${item.featureKey}-${index}`}>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-medium">{item.userName}</p>
                                <p className="text-xs text-muted-foreground">{item.userEmail || '—'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-medium">{item.featureName}</p>
                                <p className="text-xs text-muted-foreground">{item.featureKey}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {formatNumber(item.usageCount)} / {formatNumber(item.limitCount)}
                            </td>
                            <td className="px-4 py-3">{formatDateTime(item.limitReachedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Consumers</CardTitle>
              <CardDescription>Highest usage users across all metered events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Events</th>
                      <th className="px-4 py-3 font-medium">Count</th>
                      <th className="px-4 py-3 font-medium">Minutes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.topConsumers.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                          No consumer data found.
                        </td>
                      </tr>
                    ) : (
                      analytics.topConsumers.slice(0, 10).map((consumer, index) => (
                        <tr key={`${consumer.userEmail}-${index}`}>
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3 font-medium">{consumer.userName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{consumer.userEmail || '—'}</td>
                          <td className="px-4 py-3">{formatNumber(consumer.totalEvents)}</td>
                          <td className="px-4 py-3">{formatNumber(consumer.totalCount)}</td>
                          <td className="px-4 py-3">{formatNumber(consumer.totalMinutes)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
