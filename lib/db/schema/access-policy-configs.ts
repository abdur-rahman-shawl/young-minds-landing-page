import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const accessPolicyConfigStatusEnum = pgEnum(
  'access_policy_config_status',
  ['draft', 'published', 'archived']
);

export const accessPolicyConfigs = pgTable(
  'access_policy_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    version: integer('version').notNull(),
    status: accessPolicyConfigStatusEnum('status').notNull().default('draft'),
    schemaVersion: integer('schema_version').notNull().default(1),
    notes: text('notes'),
    config: jsonb('config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdBy: text('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    publishedBy: text('published_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at', { withTimezone: false }),
    createdAt: timestamp('created_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    versionUnique: uniqueIndex('access_policy_configs_version_uidx').on(
      table.version
    ),
    statusIdx: index('access_policy_configs_status_idx').on(table.status),
    publishedAtIdx: index('access_policy_configs_published_at_idx').on(
      table.publishedAt
    ),
    createdByIdx: index('access_policy_configs_created_by_idx').on(
      table.createdBy
    ),
    publishedByIdx: index('access_policy_configs_published_by_idx').on(
      table.publishedBy
    ),
  })
);

export type AccessPolicyConfig = typeof accessPolicyConfigs.$inferSelect;
export type NewAccessPolicyConfig = typeof accessPolicyConfigs.$inferInsert;
