import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import type { TRPCContext } from '../context';
import { createTRPCRouter, protectedProcedure } from '../init';
import { MessagingServiceError } from '@/lib/messaging/server/errors';
import {
  createRequestSchema,
  deleteMessageSchema,
  editMessageSchema,
  getThreadInputSchema,
  handleRequestSchema,
  listReactionsSchema,
  listRequestsInputSchema,
  listThreadsInputSchema,
  sendMessageSchema,
  startAdminConversationSchema,
  toggleReactionSchema,
  updateThreadSchema,
} from '@/lib/messaging/server/schemas';
import {
  deleteMessage,
  editMessage,
  getThread,
  handleRequest,
  listMessageReactions,
  listRequests,
  listThreads,
  sendMessage,
  sendRequest,
  startAdminConversation,
  toggleMessageReaction,
  updateThread,
} from '@/lib/messaging/server/service';

type AuthenticatedContext = TRPCContext & {
  session: NonNullable<TRPCContext['session']>;
  userId: string;
};

function mapStatusToTRPCCode(status: number): TRPCError['code'] {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function throwAsTRPCError(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof MessagingServiceError) {
    throw new TRPCError({
      code: mapStatusToTRPCCode(error.status),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof z.ZodError) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.errors[0]?.message ?? 'Invalid input',
      cause: error,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    cause: error instanceof Error ? error : undefined,
  });
}

export const messagingRouter = createTRPCRouter({
  listThreads: protectedProcedure
    .input(listThreadsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listThreads(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch message threads');
      }
    }),
  getThread: protectedProcedure
    .input(getThreadInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getThread(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch thread');
      }
    }),
  updateThread: protectedProcedure
    .input(updateThreadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateThread(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update thread');
      }
    }),
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendMessage(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to send message');
      }
    }),
  startAdminConversation: protectedProcedure
    .input(startAdminConversationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await startAdminConversation(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to start admin conversation');
      }
    }),
  listRequests: protectedProcedure
    .input(listRequestsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listRequests(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch message requests');
      }
    }),
  sendRequest: protectedProcedure
    .input(createRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendRequest(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create message request');
      }
    }),
  handleRequest: protectedProcedure
    .input(handleRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await handleRequest(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update message request');
      }
    }),
  editMessage: protectedProcedure
    .input(editMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await editMessage(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to edit message');
      }
    }),
  deleteMessage: protectedProcedure
    .input(deleteMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteMessage(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete message');
      }
    }),
  listMessageReactions: protectedProcedure
    .input(listReactionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMessageReactions(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch reactions');
      }
    }),
  toggleMessageReaction: protectedProcedure
    .input(toggleReactionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleMessageReaction(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to manage reaction');
      }
    }),
});
