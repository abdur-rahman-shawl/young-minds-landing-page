import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const adminAuditTrail = pgTable('admin_audit_trail', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetId: text('target_id'),
  targetType: text('target_type'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminAuditTrailRelations = relations(adminAuditTrail, ({ one }) => ({
  admin: one(users, {
    fields: [adminAuditTrail.adminId],
    references: [users.id],
  }),
}));
