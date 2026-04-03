import { sql } from 'drizzle-orm';

import { reviews } from '@/lib/db/schema';

export function buildAdminAverageSessionRatingSelection() {
  return {
    avgRating: sql<string | null>`AVG(${reviews.finalScore})`,
  };
}

export function normalizeAdminAverageSessionRating(value: string | number | null | undefined) {
  return Math.round((Number(value) || 0) * 10) / 10;
}
