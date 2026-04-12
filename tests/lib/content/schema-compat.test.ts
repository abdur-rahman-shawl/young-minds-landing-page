import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import {
  buildContentSelectShape,
  createContentSchemaCapabilities,
  getMissingContentColumns,
  normalizeContentRow,
} from '@/lib/content/server/schema-compat';
import { mentorContent } from '@/lib/db/schema';

function buildSelectQuerySql(columnNames: string[]) {
  const dialect = new PgDialect();
  const capabilities = createContentSchemaCapabilities(columnNames);
  const selection = buildContentSelectShape(capabilities);

  return dialect.sqlToQuery(
    sql`select ${sql.join(Object.values(selection), sql.raw(', '))} from ${mentorContent}`
  ).sql;
}

describe('content schema compatibility', () => {
  it('omits optional workflow columns from selects when the database does not have them', () => {
    const querySql = buildSelectQuerySql([
      'id',
      'mentor_id',
      'title',
      'description',
      'type',
      'status',
      'file_url',
      'file_name',
      'file_size',
      'mime_type',
      'url',
      'url_title',
      'url_description',
      'submitted_for_review_at',
      'reviewed_at',
      'reviewed_by',
      'review_note',
      'flag_reason',
      'flagged_at',
      'flagged_by',
      'created_at',
      'updated_at',
    ]);

    expect(querySql).not.toContain('"mentor_content"."deleted_at"');
    expect(querySql).not.toContain('"mentor_content"."status_before_archive"');
    expect(querySql).toContain('"mentor_content"."created_at"');
  });

  it('includes optional workflow columns when the database supports them', () => {
    const querySql = buildSelectQuerySql([
      'status_before_archive',
      'require_review_after_restore',
      'deleted_at',
      'deleted_by',
      'delete_reason',
      'purge_after_at',
    ]);

    expect(querySql).toContain('"mentor_content"."deleted_at"');
    expect(querySql).toContain('"mentor_content"."status_before_archive"');
    expect(querySql).toContain(
      '"mentor_content"."require_review_after_restore"'
    );
  });

  it('normalizes missing optional columns to safe defaults', () => {
    const normalized = normalizeContentRow(
      {
        id: 'content-1',
        title: 'Course title',
      },
      createContentSchemaCapabilities([])
    );

    expect(normalized.statusBeforeArchive).toBeNull();
    expect(normalized.requireReviewAfterRestore).toBe(false);
    expect(normalized.deletedAt).toBeNull();
    expect(normalized.deleteReason).toBeNull();
    expect(normalized.purgeAfterAt).toBeNull();
  });

  it('reports the exact missing database columns for workflow-only actions', () => {
    const missing = getMissingContentColumns(
      createContentSchemaCapabilities(['deleted_at']),
      ['statusBeforeArchive', 'requireReviewAfterRestore', 'purgeAfterAt']
    );

    expect(missing).toEqual([
      'status_before_archive',
      'require_review_after_restore',
      'purge_after_at',
    ]);
  });
});
