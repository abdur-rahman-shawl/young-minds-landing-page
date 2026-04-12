import { z } from 'zod';

export const listThreadsInputSchema = z
  .object({
    includeArchived: z.boolean().default(false),
  })
  .default({ includeArchived: false });

export const getThreadInputSchema = z.object({
  threadId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const startAdminConversationSchema = z.object({
  recipientId: z.string().trim().min(1, 'Recipient is required'),
  content: z.string().trim().min(1, 'Message is required').max(5000),
});

export const createRequestSchema = z.object({
  recipientId: z.string().min(1),
  initialMessage: z.string().min(10).max(500),
  requestReason: z.string().optional(),
  requestType: z.enum(['mentor_to_mentee', 'mentee_to_mentor']),
});

export const listRequestsInputSchema = z
  .object({
    type: z.enum(['all', 'sent', 'received']).default('received'),
    status: z
      .enum(['all', 'pending', 'accepted', 'rejected', 'expired', 'cancelled'])
      .default('pending'),
  })
  .default({ type: 'received', status: 'pending' });

export const handleRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['accept', 'reject', 'cancel']),
  responseMessage: z.string().optional(),
});

export const updateThreadSchema = z.object({
  threadId: z.string().uuid(),
  action: z.enum(['archive', 'unarchive', 'mute', 'unmute', 'delete', 'markAsRead']),
  muteDuration: z.number().int().positive().optional(),
});

export const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  replyToId: z.string().uuid().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
  attachmentSize: z.string().optional(),
  attachmentName: z.string().optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().uuid(),
});

export const listReactionsSchema = z.object({
  messageId: z.string().uuid(),
});

export const toggleReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().emoji().min(1).max(4),
});
