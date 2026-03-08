import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { requireAdmin } from '@/lib/api/guards';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getAnalyticsData, type SubscriptionAudience } from '@/lib/db/queries/subscriptions';

type AudienceFilter = 'all' | SubscriptionAudience;

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

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  usageByFeature: UsageByFeatureItem[];
  usageOverTime: UsageOverTimeItem[];
  limitBreaches: LimitBreachItem[];
  planDistribution: PlanDistributionItem[];
  topConsumers: TopConsumerItem[];
}

interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseDateParam(
  value: string | null,
  fallback: Date,
  endOfDay: boolean
): { date: Date; error: string | null } {
  if (!value) {
    return { date: fallback, error: null };
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const normalized = dateOnlyPattern.test(value)
    ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : value;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return { date: fallback, error: `Invalid date format: ${value}` };
  }

  return { date: parsed, error: null };
}

function parseAudience(value: string | null): AudienceFilter | null {
  if (!value) return 'all';
  if (value === 'all' || value === 'mentor' || value === 'mentee') {
    return value;
  }
  return null;
}

function getDateKey(value: string): string {
  return value.slice(0, 10);
}

function getDateRangeKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUtcDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cursor.getTime() <= endUtcDate.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function getUsageMetricValue(
  valueType: string,
  usageCount: number,
  usageMinutes: number,
  usageAmount: number | string | null
): number {
  if (valueType === 'minutes') return usageMinutes || 0;
  if (valueType === 'amount') return toNumber(usageAmount);
  if (valueType === 'count') return usageCount || 0;
  if (usageCount) return usageCount;
  if (usageMinutes) return usageMinutes;
  return toNumber(usageAmount);
}

function getLimitValue(
  valueType: string,
  planLimit: { limit_count: number | null; limit_minutes: number | null; limit_amount: number | string | null } | null
): number | null {
  if (!planLimit) return null;
  if (valueType === 'minutes') return planLimit.limit_minutes ?? null;
  if (valueType === 'amount') {
    const amount = toNumber(planLimit.limit_amount);
    return amount > 0 ? amount : null;
  }
  if (valueType === 'count') return planLimit.limit_count ?? null;
  return planLimit.limit_count ?? planLimit.limit_minutes ?? toNumber(planLimit.limit_amount);
}

function emptyAnalyticsPayload(): AnalyticsResponse {
  return {
    overview: {
      totalEvents: 0,
      uniqueActiveUsers: 0,
      featuresAtLimit: 0,
      limitBreachCount: 0,
    },
    usageByFeature: [],
    usageOverTime: [],
    limitBreaches: [],
    planDistribution: [],
    topConsumers: [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const { searchParams } = new URL(request.url);
    const today = new Date();
    const defaultEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    const defaultStart = new Date(defaultEnd);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 30);
    defaultStart.setUTCHours(0, 0, 0, 0);

    const audience = parseAudience(searchParams.get('audience'));
    if (!audience) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience. Use all, mentor, or mentee.' },
        { status: 400 }
      );
    }

    const parsedStart = parseDateParam(searchParams.get('startDate'), defaultStart, false);
    if (parsedStart.error) {
      return NextResponse.json({ success: false, error: parsedStart.error }, { status: 400 });
    }

    const parsedEnd = parseDateParam(searchParams.get('endDate'), defaultEnd, true);
    if (parsedEnd.error) {
      return NextResponse.json({ success: false, error: parsedEnd.error }, { status: 400 });
    }

    const startDate = parsedStart.date;
    const endDate = parsedEnd.date;

    if (startDate.getTime() > endDate.getTime()) {
      return NextResponse.json(
        { success: false, error: 'startDate must be earlier than or equal to endDate.' },
        { status: 400 }
      );
    }

    const result = await getAnalyticsData(startDate.toISOString(), endDate.toISOString(), audience);
    if (!result.events.length && !result.usageByFeatureRows.length && !result.planDistribution.length) {
      return NextResponse.json({ success: true, data: emptyAnalyticsPayload() });
    }

    const overview: AnalyticsOverview = {
      totalEvents: result.events.length,
      uniqueActiveUsers: new Set(result.events.map((event: any) => event.user_id).filter(Boolean)).size,
      featuresAtLimit: result.featuresAtLimitCount,
      limitBreachCount: result.events.filter((event: any) => Boolean(event.limit_exceeded)).length,
    };

    const planFeatureLimitMap = new Map<string, { limit_count: number | null; limit_minutes: number | null; limit_amount: number | string | null }>();
    for (const row of result.planLimits) {
      planFeatureLimitMap.set(`${row.plan_id}:${row.feature_id}`, row);
    }

    const usageByFeatureAccumulator = new Map<string, {
      featureKey: string;
      featureName: string;
      unit: string | null;
      totalUsage: number;
      totalLimit: number;
      limitSamples: number;
    }>();

    for (const row of result.usageByFeatureRows) {
      const usageValue = getUsageMetricValue(
        row.value_type,
        row.usage_count,
        row.usage_minutes,
        row.usage_amount
      );

      const current = usageByFeatureAccumulator.get(row.feature_key) || {
        featureKey: row.feature_key,
        featureName: row.name,
        unit: row.unit,
        totalUsage: 0,
        totalLimit: 0,
        limitSamples: 0,
      };

      current.totalUsage += usageValue;

      const limitValue = getLimitValue(
        row.value_type,
        planFeatureLimitMap.get(`${row.plan_id}:${row.feature_id}`) || null
      );
      if (limitValue !== null) {
        current.totalLimit += limitValue;
        current.limitSamples += 1;
      }

      usageByFeatureAccumulator.set(row.feature_key, current);
    }

    const usageByFeature: UsageByFeatureItem[] = Array.from(usageByFeatureAccumulator.values())
      .map((item: { featureKey: string; featureName: string; unit: string | null; totalUsage: number; totalLimit: number; limitSamples: number }) => ({
        featureKey: item.featureKey,
        featureName: item.featureName,
        unit: item.unit,
        totalUsage: Number(item.totalUsage.toFixed(2)),
        averageLimit: item.limitSamples > 0 ? Number((item.totalLimit / item.limitSamples).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage);

    const usageOverTimeMap = new Map<string, { eventCount: number; userIds: Set<string> }>();
    for (const dateKey of getDateRangeKeys(startDate, endDate)) {
      usageOverTimeMap.set(dateKey, { eventCount: 0, userIds: new Set<string>() });
    }
    for (const event of result.events) {
      const dateKey = getDateKey(new Date(event.created_at).toISOString());
      const current = usageOverTimeMap.get(dateKey) || { eventCount: 0, userIds: new Set<string>() };
      current.eventCount += 1;
      if (event.user_id) current.userIds.add(event.user_id);
      usageOverTimeMap.set(dateKey, current);
    }
    const usageOverTime: UsageOverTimeItem[] = Array.from(usageOverTimeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        date,
        eventCount: value.eventCount,
        uniqueUsers: value.userIds.size,
      }));

    const planDistribution: PlanDistributionItem[] = result.planDistribution.map((row: any) => ({
      planName: row.name,
      planKey: row.plan_key,
      audience: row.audience,
      activeCount: row.active_count,
    }));

    const topConsumersMap = new Map<string, { userId: string; totalEvents: number; totalCount: number; totalMinutes: number }>();
    for (const event of result.events) {
      if (!event.user_id) continue;
      const current = topConsumersMap.get(event.user_id) || {
        userId: event.user_id,
        totalEvents: 0,
        totalCount: 0,
        totalMinutes: 0,
      };
      current.totalEvents += 1;
      current.totalCount += toNumber(event.count_delta);
      current.totalMinutes += toNumber(event.minutes_delta);
      topConsumersMap.set(event.user_id, current);
    }

    const topConsumersRanked = Array.from(topConsumersMap.values())
      .sort((a, b) => {
        if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
        if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
        return b.totalMinutes - a.totalMinutes;
      })
      .slice(0, 10);

    const limitBreachDraftRows = result.limitBreaches
      .map((row: any) => {
        const limitValue = getLimitValue(
          row.value_type,
          planFeatureLimitMap.get(`${row.plan_id}:${row.feature_id}`) || null
        );
        return {
          userId: row.user_id,
          featureName: row.name,
          featureKey: row.feature_key,
          usageCount: Number(
            getUsageMetricValue(row.value_type, row.usage_count, row.usage_minutes, row.usage_amount).toFixed(2)
          ),
          limitCount: Number((limitValue ?? 0).toFixed(2)),
          limitReachedAt: row.limit_reached_at ? new Date(row.limit_reached_at).toISOString() : null,
        };
      })
      .slice(0, 20);

    const userIds = Array.from(
      new Set(
        [
          ...topConsumersRanked.map((item: { userId: string }) => item.userId),
          ...limitBreachDraftRows.map((item: { userId: string }) => item.userId),
        ]
          .filter((id): id is string => Boolean(id))
      )
    );

    let usersById: Record<string, UserProfileRow> = {};
    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds));

      usersById = userRows.reduce((acc: Record<string, UserProfileRow>, user: UserProfileRow) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, UserProfileRow>);
    }

    const topConsumers: TopConsumerItem[] = topConsumersRanked.map((item) => {
      const user = usersById[item.userId];
      return {
        userName: user?.name || user?.email || item.userId,
        userEmail: user?.email || '',
        totalEvents: item.totalEvents,
        totalCount: item.totalCount,
        totalMinutes: item.totalMinutes,
      };
    });

    const limitBreaches: LimitBreachItem[] = limitBreachDraftRows.map((item: {
      userId: string;
      featureName: string;
      featureKey: string;
      usageCount: number;
      limitCount: number;
      limitReachedAt: string | null;
    }) => {
      const user = usersById[item.userId];
      return {
        userName: user?.name || user?.email || item.userId,
        userEmail: user?.email || '',
        featureName: item.featureName,
        featureKey: item.featureKey,
        usageCount: item.usageCount,
        limitCount: item.limitCount,
        limitReachedAt: item.limitReachedAt,
      };
    });

    const response: AnalyticsResponse = {
      overview,
      usageByFeature,
      usageOverTime,
      limitBreaches,
      planDistribution,
      topConsumers,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Failed to load subscription analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load subscription analytics' },
      { status: 500 }
    );
  }
}
