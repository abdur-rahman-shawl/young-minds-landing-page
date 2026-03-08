import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guards';
import { listSubscriptionsForAdmin } from '@/lib/db/queries/subscriptions';

const DEFAULT_PAGE_SIZE = 25;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const audienceParam = searchParams.get('audience');
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);

    const statuses =
      statusParam && statusParam !== 'all'
        ? statusParam.split(',').map((status) => status.trim()).filter(Boolean)
        : undefined;

    const result = await listSubscriptionsForAdmin({
      statuses,
      audience: audienceParam === 'mentor' || audienceParam === 'mentee' ? audienceParam : 'all',
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: {
        page,
        pageSize,
        total: result.total || 0,
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
