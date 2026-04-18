import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();

  return {
    ...actual,
    desc: (field: unknown) => ({
      kind: 'desc',
      field,
    }),
    eq: (field: unknown, value: unknown) => ({
      kind: 'eq',
      field,
      value,
    }),
  };
});

const { logAdminAction } = vi.hoisted(() => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@/lib/db/audit', () => ({
  logAdminAction,
}));

import {
  publishAdminAccessPolicyDraft,
  upsertAdminAccessPolicyDraft,
} from '@/lib/access-policy/admin-service';
import { accessPolicyConfigs } from '@/lib/db/schema';
import { MENTEE_FEATURE_KEYS } from '@/lib/mentee/access-policy';
import { MENTOR_FEATURE_KEYS } from '@/lib/mentor/access-policy';

interface ConfigRow {
  id: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  schemaVersion: number;
  notes: string | null;
  config: Record<string, unknown>;
  createdBy: string | null;
  publishedBy: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function createConfigRow(partial: Partial<ConfigRow> & Pick<ConfigRow, 'id' | 'version' | 'status'>): ConfigRow {
  const now = new Date('2026-04-13T00:00:00.000Z');

  return {
    schemaVersion: 1,
    notes: null,
    config: {},
    createdBy: 'admin-1',
    publishedBy: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function applySelection<T extends Record<string, unknown>>(
  row: T,
  selection?: Record<string, unknown>
) {
  if (!selection) {
    return row;
  }

  return Object.fromEntries(
    Object.entries(selection).map(([key, value]) => {
      if (value === accessPolicyConfigs.version) {
        return [key, row.version];
      }

      return [key, row[key as keyof T]];
    })
  );
}

function createUpdateResult(updatedRows: ConfigRow[]) {
  return {
    returning: async () => updatedRows,
    then: (onFulfilled: (value: undefined) => unknown) =>
      Promise.resolve(undefined).then(onFulfilled),
  };
}

function createSelectResult<T>(rows: T[]) {
  return {
    limit: async (count: number) => rows.slice(0, count),
    then: (onFulfilled: (value: T[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };
}

function createFakeDb(initialRows: ConfigRow[]) {
  const rows = [...initialRows];

  const filterRows = (condition?: { field: unknown; value: unknown }) => {
    if (!condition) {
      return [...rows];
    }

    if (condition.field === accessPolicyConfigs.status) {
      return rows.filter((row) => row.status === condition.value);
    }

    if (condition.field === accessPolicyConfigs.id) {
      return rows.filter((row) => row.id === condition.value);
    }

    return [...rows];
  };

  const sortRows = (resultRows: ConfigRow[], order?: { field: unknown }) => {
    if (order?.field === accessPolicyConfigs.version) {
      return [...resultRows].sort((a, b) => b.version - a.version);
    }

    return resultRows;
  };

  return {
    rows,
    select(selection?: Record<string, unknown>) {
      return {
        from() {
          return {
            where(condition: { field: unknown; value: unknown }) {
              return createSelectResult(
                filterRows(condition).map((row) =>
                  applySelection(row, selection)
                )
              );
            },
            orderBy(order: { field: unknown }) {
              return createSelectResult(
                sortRows(filterRows(), order).map((row) =>
                  applySelection(row, selection)
                )
              );
            },
          };
        },
      };
    },
    insert() {
      return {
        values(value: Partial<ConfigRow>) {
          const row = createConfigRow({
            id:
              value.id ??
              `config-${rows.length + 1}`,
            version: value.version ?? rows.length + 1,
            status: (value.status as ConfigRow['status']) ?? 'draft',
            ...value,
          });
          rows.push(row);

          return {
            returning: async () => [row],
          };
        },
      };
    },
    update() {
      return {
        set(values: Partial<ConfigRow>) {
          return {
            where(condition: { field: unknown; value: unknown }) {
              const updatedRows = filterRows(condition).map((row) => {
                Object.assign(row, values);
                return row;
              });

              return createUpdateResult(updatedRows);
            },
          };
        },
      };
    },
    async transaction<T>(callback: (tx: any) => Promise<T>) {
      return callback(this);
    },
  };
}

const adminActor = {
  id: 'admin-1',
  roles: [{ name: 'admin', displayName: 'Admin' }],
  isActive: true,
  isBlocked: false,
};

describe('access policy admin service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft version with validated overrides', async () => {
    const fakeDb = createFakeDb([]);

    const result = await upsertAdminAccessPolicyDraft(
      {
        db: fakeDb as never,
        userId: 'admin-1',
        currentUser: adminActor as never,
      },
      {
        notes: 'Enable learning workspace during grace period',
        overrides: {
          mentee: {
            features: {
              [MENTEE_FEATURE_KEYS.learningWorkspace]: {
                subscription: {
                  missing: 'ok',
                },
              },
            },
          },
        },
      }
    );

    expect(result.draft?.version).toBe(1);
    expect(
      result.draft?.effective.mentee.features[
        MENTEE_FEATURE_KEYS.learningWorkspace
      ].subscription?.missing
    ).toBe('ok');
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'access_policy_draft_created',
        targetType: 'access_policy_config',
      })
    );
  });

  it('publishes the draft and archives the previous published version', async () => {
    const fakeDb = createFakeDb([
      createConfigRow({
        id: 'published-1',
        version: 1,
        status: 'published',
        notes: 'Current production policy',
      }),
      createConfigRow({
        id: 'draft-2',
        version: 2,
        status: 'draft',
        notes: 'Pending rollout',
        config: {
          mentor: {
            features: {
              [MENTOR_FEATURE_KEYS.scheduleManage]: {
                verification: {
                  IN_PROGRESS: 'ok',
                },
              },
            },
          },
        },
      }),
    ]);

    const result = await publishAdminAccessPolicyDraft({
      db: fakeDb as never,
      userId: 'admin-1',
      currentUser: adminActor as never,
    });

    expect(
      fakeDb.rows.find((row) => row.id === 'published-1')?.status
    ).toBe('archived');
    expect(fakeDb.rows.find((row) => row.id === 'draft-2')?.status).toBe(
      'published'
    );
    expect(result.published?.version).toBe(2);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'access_policy_published',
        targetType: 'access_policy_config',
      })
    );
  });
});
