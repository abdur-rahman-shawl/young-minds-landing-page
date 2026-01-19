import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_PAGE_SIZE = 25;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const audienceParam = searchParams.get('audience');
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);

    let query = supabase
      .from('subscriptions')
      .select(
        `
        id,
        user_id,
        status,
        quantity,
        current_period_start,
        current_period_end,
        provider,
        provider_subscription_id,
        created_at,
        subscription_plans(
          id,
          plan_key,
          name,
          audience
        ),
        subscription_plan_prices(
          id,
          amount,
          currency,
          billing_interval,
          billing_interval_count,
          price_type,
          is_active
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (statusParam && statusParam !== 'all') {
      const statuses = statusParam
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else if (statuses.length > 1) {
        query = query.in('status', statuses);
      }
    }

    if (audienceParam && audienceParam !== 'all') {
      query = query.eq('subscription_plans.audience', audienceParam);
    }

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const { data, error, count } = await query.range(rangeFrom, rangeTo);

    if (error) {
      throw error;
    }

    const subscriptions = data || [];
    const userIds = Array.from(
      new Set(
        subscriptions
          .map((subscription) => subscription.user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let usersById: Record<string, { id: string; name: string | null; email: string | null }> = {};

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
        {} as Record<string, { id: string; name: string | null; email: string | null }>
      );
    }

    const enriched = subscriptions.map((subscription) => ({
      ...subscription,
      user: subscription.user_id ? usersById[subscription.user_id] || null : null,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      meta: {
        page,
        pageSize,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
