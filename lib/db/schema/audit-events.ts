import { pgTable, text, timestamp, uuid, jsonb, integer, index } from 'drizzle-orm/pg-core';

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  status: text('status'),
  requestId: text('request_id'),
  traceId: text('trace_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: jsonb('details'),
  diff: jsonb('diff'),
  schemaVersion: integer('schema_version').default(1).notNull(),
}, (table) => ({
  resourceOccurredIdx: index('audit_events_resource_occurred_idx').on(
    table.resourceType,
    table.resourceId,
    table.occurredAt
  ),
  actorOccurredIdx: index('audit_events_actor_occurred_idx').on(
    table.actorId,
    table.occurredAt
  ),
  actionOccurredIdx: index('audit_events_action_occurred_idx').on(
    table.action,
    table.occurredAt
  ),
}));

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
