import { assertMessagingAccess } from '@/lib/access-policy/server';
import { MESSAGING_ACCESS_INTENTS } from '@/lib/messaging/access-policy';
import type { TRPCContext } from '../context';
import { createTRPCRouter, messagingMailboxProcedure, userProcedure } from '../init';
import { throwAsTRPCError } from '@/lib/trpc/router-error';
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

function getRequestAudience(
  requestType: 'mentor_to_mentee' | 'mentee_to_mentor'
) {
  return requestType === 'mentor_to_mentee' ? 'mentor' : 'mentee';
}

export const messagingRouter = createTRPCRouter({
  listThreads: messagingMailboxProcedure
    .input(listThreadsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listThreads(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch message threads');
      }
    }),
  getThread: messagingMailboxProcedure
    .input(getThreadInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getThread(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch thread');
      }
    }),
  updateThread: messagingMailboxProcedure
    .input(updateThreadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateThread(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update thread');
      }
    }),
  sendMessage: messagingMailboxProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendMessage(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to send message');
      }
    }),
  startAdminConversation: messagingMailboxProcedure
    .input(startAdminConversationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await startAdminConversation(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to start admin conversation');
      }
    }),
  listRequests: messagingMailboxProcedure
    .input(listRequestsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listRequests(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch message requests');
      }
    }),
  sendRequest: userProcedure
    .input(createRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await assertMessagingAccess({
          userId: ctx.userId,
          intent: MESSAGING_ACCESS_INTENTS.messageRequests,
          audience: getRequestAudience(input.requestType),
          currentUser: ctx.currentUser,
          cache: ctx.accessPolicyCache,
          source: 'trpc.messaging.messageRequests',
        });

        return await sendRequest(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create message request');
      }
    }),
  handleRequest: messagingMailboxProcedure
    .input(handleRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await handleRequest(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update message request');
      }
    }),
  editMessage: messagingMailboxProcedure
    .input(editMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await editMessage(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to edit message');
      }
    }),
  deleteMessage: messagingMailboxProcedure
    .input(deleteMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteMessage(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete message');
      }
    }),
  listMessageReactions: messagingMailboxProcedure
    .input(listReactionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMessageReactions(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch reactions');
      }
    }),
  toggleMessageReaction: messagingMailboxProcedure
    .input(toggleReactionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleMessageReaction(ctx as AuthenticatedContext, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to manage reaction');
      }
    }),
});
