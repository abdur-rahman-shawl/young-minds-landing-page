import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guards';
import { createClient } from '@/lib/supabase/server';

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

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  usageByFeature: UsageByFeatureItem[];
  usageOverTime: UsageOverTimeItem[];
  limitBreaches: LimitBreachItem[];
  planDistribution: PlanDistributionItem[];
  topConsumers: TopConsumerItem[];
}

type Relation<T> = T | T[] | null;

interface UsageEventRow {
  subscription_id: string;
  user_id: string;
  count_delta: number | null;
  minutes_delta: number | null;
  limit_exceeded: boolean;
  created_at: string;
}

interface UsageOverTimeEventRow {
  user_id: string;
  created_at: string;
}

interface UsageTrackingFeatureRelation {
  feature_key: string;
  name: string;
  unit: string | null;
  value_type: string;
}

interface UsageTrackingSubscriptionRelation {
  user_id: string;
  plan_id: string;
}

interface UsageTrackingRow {
  subscription_id: string;
  feature_id: string;
  usage_count: number;
  usage_minutes: number;
  usage_amount: number | string | null;
  limit_reached: boolean;
  limit_reached_at: string | null;
  subscription_features: Relation<UsageTrackingFeatureRelation>;
  subscriptions: Relation<UsageTrackingSubscriptionRelation>;
}

interface PlanFeatureLimitRow {
  plan_id: string;
  feature_id: string;
  is_included: boolean;
  limit_count: number | null;
  limit_minutes: number | null;
  limit_amount: number | string | null;
}

interface PlanDistributionSubscriptionRow {
  subscription_plans: Relation<{
    plan_key: string;
    name: string;
    audience: 'mentor' | 'mentee';
  }>;
}

interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
}

function firstRelation<T>(value: Relation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
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
  planFeature: PlanFeatureLimitRow | null
): number | null {
  if (!planFeature) return null;

  if (valueType === 'minutes') {
    return planFeature.limit_minutes ?? null;
  }
  if (valueType === 'amount') {
    const amount = toNumber(planFeature.limit_amount);
    return amount > 0 ? amount : null;
  }
  if (valueType === 'count') {
    return planFeature.limit_count ?? null;
  }

  return (
    planFeature.limit_count ??
    planFeature.limit_minutes ??
    (planFeature.limit_amount !== null ? toNumber(planFeature.limit_amount) : null)
  );
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

    const supabase = await createClient();
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

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let audienceSubscriptionIds: string[] | null = null;
    if (audience !== 'all') {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, subscription_plans!inner(audience)')
        .eq('subscription_plans.audience', audience);

      if (error) {
        throw error;
      }

      audienceSubscriptionIds = Array.from(
        new Set((data || []).map((row) => row.id).filter((id): id is string => Boolean(id)))
      );

      if (audienceSubscriptionIds.length === 0) {
        return NextResponse.json({ success: true, data: emptyAnalyticsPayload() });
      }
    }

    let q1EventsQuery = supabase
      .from('subscription_usage_events')
      .select('subscription_id, user_id, count_delta, minutes_delta, limit_exceeded, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    let q2FeaturesAtLimitQuery = supabase
      .from('subscription_usage_tracking')
      .select('id', { count: 'exact', head: true })
      .eq('limit_reached', true)
      .lte('period_start', endIso)
      .gte('period_end', startIso);

    let q3UsageByFeatureQuery = supabase
      .from('subscription_usage_tracking')
      .select(`
        subscription_id,
        feature_id,
        usage_count,
        usage_minutes,
        usage_amount,
        subscription_features(feature_key, name, unit, value_type),
        subscriptions(user_id, plan_id)
      `)
      .lte('period_start', endIso)
      .gte('period_end', startIso);

    const q3PlanLimitsQuery = supabase
      .from('subscription_plan_features')
      .select('plan_id, feature_id, is_included, limit_count, limit_minutes, limit_amount')
      .eq('is_included', true);

    let q4UsageOverTimeQuery = supabase
      .from('subscription_usage_events')
      .select('subscription_id, user_id, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    let q5PlanDistributionQuery = supabase
      .from('subscriptions')
      .select('subscription_plans!inner(plan_key, name, audience)')
      .in('status', ['active', 'trialing']);

    let q6LimitBreachesQuery = supabase
      .from('subscription_usage_tracking')
      .select(`
        subscription_id,
        feature_id,
        usage_count,
        usage_minutes,
        usage_amount,
        limit_reached,
        limit_reached_at,
        subscriptions(user_id, plan_id),
        subscription_features(feature_key, name, unit, value_type)
      `)
      .eq('limit_reached', true)
      .lte('period_start', endIso)
      .gte('period_end', startIso)
      .order('limit_reached_at', { ascending: false });

    if (audienceSubscriptionIds) {
      q1EventsQuery = q1EventsQuery.in('subscription_id', audienceSubscriptionIds);
      q2FeaturesAtLimitQuery = q2FeaturesAtLimitQuery.in('subscription_id', audienceSubscriptionIds);
      q3UsageByFeatureQuery = q3UsageByFeatureQuery.in('subscription_id', audienceSubscriptionIds);
      q4UsageOverTimeQuery = q4UsageOverTimeQuery.in('subscription_id', audienceSubscriptionIds);
      q6LimitBreachesQuery = q6LimitBreachesQuery.in('subscription_id', audienceSubscriptionIds);
      q5PlanDistributionQuery = q5PlanDistributionQuery.eq('subscription_plans.audience', audience);
    }

    const [
      q1EventsResult,
      q2FeaturesAtLimitResult,
      q3UsageByFeatureResult,
      q3PlanLimitsResult,
      q4UsageOverTimeResult,
      q5PlanDistributionResult,
      q6LimitBreachesResult,
    ] = await Promise.all([
      q1EventsQuery,
      q2FeaturesAtLimitQuery,
      q3UsageByFeatureQuery,
      q3PlanLimitsQuery,
      q4UsageOverTimeQuery,
      q5PlanDistributionQuery,
      q6LimitBreachesQuery,
    ]);

    if (q1EventsResult.error) throw q1EventsResult.error;
    if (q2FeaturesAtLimitResult.error) throw q2FeaturesAtLimitResult.error;
    if (q3UsageByFeatureResult.error) throw q3UsageByFeatureResult.error;
    if (q3PlanLimitsResult.error) throw q3PlanLimitsResult.error;
    if (q4UsageOverTimeResult.error) throw q4UsageOverTimeResult.error;
    if (q5PlanDistributionResult.error) throw q5PlanDistributionResult.error;
    if (q6LimitBreachesResult.error) throw q6LimitBreachesResult.error;

    const q1Events = (q1EventsResult.data || []) as UsageEventRow[];
    const q4UsageEvents = (q4UsageOverTimeResult.data || []) as UsageOverTimeEventRow[];
    const q3UsageRows = (q3UsageByFeatureResult.data || []) as UsageTrackingRow[];
    const q3PlanLimitRows = (q3PlanLimitsResult.data || []) as PlanFeatureLimitRow[];
    const q5Subscriptions = (q5PlanDistributionResult.data || []) as PlanDistributionSubscriptionRow[];
    const q6BreachRows = (q6LimitBreachesResult.data || []) as UsageTrackingRow[];

    const overview: AnalyticsOverview = {
      totalEvents: q1Events.length,
      uniqueActiveUsers: new Set(q1Events.map((event) => event.user_id).filter(Boolean)).size,
      featuresAtLimit: q2FeaturesAtLimitResult.count || 0,
      limitBreachCount: q1Events.filter((event) => Boolean(event.limit_exceeded)).length,
    };

    const planFeatureLimitMap = new Map<string, PlanFeatureLimitRow>();
    for (const row of q3PlanLimitRows) {
      planFeatureLimitMap.set(`${row.plan_id}:${row.feature_id}`, row);
    }

    const usageByFeatureAccumulator = new Map<
      string,
      {
        featureKey: string;
        featureName: string;
        unit: string | null;
        totalUsage: number;
        totalLimit: number;
        limitSamples: number;
      }
    >();

    for (const row of q3UsageRows) {
      const feature = firstRelation(row.subscription_features);
      const subscription = firstRelation(row.subscriptions);
      if (!feature || !subscription) continue;

      const usageValue = getUsageMetricValue(
        feature.value_type,
        row.usage_count,
        row.usage_minutes,
        row.usage_amount
      );

      const mapKey = feature.feature_key;
      const existing = usageByFeatureAccumulator.get(mapKey) || {
        featureKey: feature.feature_key,
        featureName: feature.name,
        unit: feature.unit,
        totalUsage: 0,
        totalLimit: 0,
        limitSamples: 0,
      };

      existing.totalUsage += usageValue;

      const planLimit = planFeatureLimitMap.get(`${subscription.plan_id}:${row.feature_id}`) || null;
      const limitValue = getLimitValue(feature.value_type, planLimit);
      if (limitValue !== null) {
        existing.totalLimit += limitValue;
        existing.limitSamples += 1;
      }

      usageByFeatureAccumulator.set(mapKey, existing);
    }

    const usageByFeature: UsageByFeatureItem[] = Array.from(usageByFeatureAccumulator.values())
      .map((item) => ({
        featureKey: item.featureKey,
        featureName: item.featureName,
        unit: item.unit,
        totalUsage: Number(item.totalUsage.toFixed(2)),
        averageLimit:
          item.limitSamples > 0 ? Number((item.totalLimit / item.limitSamples).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage);

    const usageOverTimeMap = new Map<
      string,
      {
        eventCount: number;
        userIds: Set<string>;
      }
    >();

    for (const dateKey of getDateRangeKeys(startDate, endDate)) {
      usageOverTimeMap.set(dateKey, { eventCount: 0, userIds: new Set<string>() });
    }

    for (const event of q4UsageEvents) {
      const dateKey = getDateKey(event.created_at);
      if (!usageOverTimeMap.has(dateKey)) {
        usageOverTimeMap.set(dateKey, { eventCount: 0, userIds: new Set<string>() });
      }
      const current = usageOverTimeMap.get(dateKey)!;
      current.eventCount += 1;
      if (event.user_id) {
        current.userIds.add(event.user_id);
      }
    }

    const usageOverTime: UsageOverTimeItem[] = Array.from(usageOverTimeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        date,
        eventCount: value.eventCount,
        uniqueUsers: value.userIds.size,
      }));

    const planDistributionMap = new Map<string, PlanDistributionItem>();
    for (const row of q5Subscriptions) {
      const plan = firstRelation(row.subscription_plans);
      if (!plan) continue;
      const key = plan.plan_key;
      const existing = planDistributionMap.get(key) || {
        planName: plan.name,
        planKey: plan.plan_key,
        audience: plan.audience,
        activeCount: 0,
      };
      existing.activeCount += 1;
      planDistributionMap.set(key, existing);
    }

    const planDistribution: PlanDistributionItem[] = Array.from(planDistributionMap.values()).sort(
      (a, b) => b.activeCount - a.activeCount
    );

    const topConsumersMap = new Map<
      string,
      {
        userId: string;
        totalEvents: number;
        totalCount: number;
        totalMinutes: number;
      }
    >();

    for (const event of q1Events) {
      if (!event.user_id) continue;
      const existing = topConsumersMap.get(event.user_id) || {
        userId: event.user_id,
        totalEvents: 0,
        totalCount: 0,
        totalMinutes: 0,
      };
      existing.totalEvents += 1;
      existing.totalCount += toNumber(event.count_delta);
      existing.totalMinutes += toNumber(event.minutes_delta);
      topConsumersMap.set(event.user_id, existing);
    }

    const topConsumersRanked = Array.from(topConsumersMap.values())
      .sort((a, b) => {
        if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
        if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
        return b.totalMinutes - a.totalMinutes;
      })
      .slice(0, 10);

    const limitBreachDraftRows = q6BreachRows
      .map((row) => {
        const feature = firstRelation(row.subscription_features);
        const subscription = firstRelation(row.subscriptions);
        if (!feature || !subscription) return null;

        const planLimit =
          planFeatureLimitMap.get(`${subscription.plan_id}:${row.feature_id}`) || null;
        const usageValue = getUsageMetricValue(
          feature.value_type,
          row.usage_count,
          row.usage_minutes,
          row.usage_amount
        );
        const limitValue = getLimitValue(feature.value_type, planLimit);

        return {
          userId: subscription.user_id,
          featureName: feature.name,
          featureKey: feature.feature_key,
          usageCount: Number(usageValue.toFixed(2)),
          limitCount: Number((limitValue ?? 0).toFixed(2)),
          limitReachedAt: row.limit_reached_at,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, 20);

    const userIds = Array.from(
      new Set(
        [...topConsumersRanked.map((item) => item.userId), ...limitBreachDraftRows.map((item) => item.userId)].filter(
          (id): id is string => Boolean(id)
        )
      )
    );

    let usersById: Record<string, UserProfileRow> = {};
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (usersError) {
        throw usersError;
      }

      usersById = (users || []).reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<string, UserProfileRow>
      );
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

    const limitBreaches: LimitBreachItem[] = limitBreachDraftRows.map((item) => {
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
