import { pgTable, text, timestamp, boolean, uuid, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { mentors } from './mentors';
import { mentees } from './mentees';

export const messageRequestStatusEnum = pgEnum('message_request_status', [
  'pending',
  'accepted',
  'rejected',
  'expired',
  'cancelled'
]);

export const messageRequestTypeEnum = pgEnum('message_request_type', [
  'mentor_to_mentee',
  'mentee_to_mentor'
]);

export const messageRequests = pgTable('message_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  requesterId: text('requester_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipientId: text('recipient_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  requestType: messageRequestTypeEnum('request_type').notNull(),
  status: messageRequestStatusEnum('status').default('pending').notNull(),
  
  initialMessage: text('initial_message').notNull(),
  requestReason: text('request_reason'),
  
  maxMessages: integer('max_messages').default(1),
  messagesUsed: integer('messages_used').default(0),
  
  respondedAt: timestamp('responded_at'),
  responseMessage: text('response_message'),
  
  expiresAt: timestamp('expires_at').notNull(),
  
  metadata: text('metadata'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messageRequestsRelations = relations(messageRequests, ({ one }) => ({
  requester: one(users, {
    fields: [messageRequests.requesterId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messageRequests.recipientId],
    references: [users.id],
  }),
}));

export type MessageRequest = typeof messageRequests.$inferSelect;
export type NewMessageRequest = typeof messageRequests.$inferInsert;
export type MessageRequestStatus = typeof messageRequestStatusEnum.enumValues[number];
export type MessageRequestType = typeof messageRequestTypeEnum.enumValues[number];