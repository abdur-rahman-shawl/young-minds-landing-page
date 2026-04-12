import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import {
  buildAdminAverageSessionRatingSelection,
  normalizeAdminAverageSessionRating,
} from '@/lib/bookings/admin-stats';
import { reviews } from '@/lib/db/schema';

describe('buildAdminAverageSessionRatingSelection', () => {
  it('aggregates the current reviews.finalScore column', () => {
    const dialect = new PgDialect();
    const selection = buildAdminAverageSessionRatingSelection();
    const query = dialect.sqlToQuery(sql`select ${selection.avgRating} from ${reviews}`);

    expect(query.sql).toContain('"reviews"."final_score"');
    expect(query.sql).not.toContain('"reviews"."rating"');
  });
});

describe('normalizeAdminAverageSessionRating', () => {
  it('rounds decimal average scores to one decimal place', () => {
    expect(normalizeAdminAverageSessionRating('4.26')).toBe(4.3);
  });

  it('returns zero when no review aggregate is available', () => {
    expect(normalizeAdminAverageSessionRating(null)).toBe(0);
  });
});
