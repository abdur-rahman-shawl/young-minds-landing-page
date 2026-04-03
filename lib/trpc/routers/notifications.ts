import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../init';
import {
  bulkUpdateNotifications,
  deleteNotification,
  listNotifications,
  updateNotification,
} from '@/lib/notifications/server/service';
import { NotificationServiceError } from '@/lib/notifications/server/errors';
import {
  bulkNotificationsInputSchema,
  deleteNotificationInputSchema,
  listNotificationsInputSchema,
  updateNotificationInputSchema,
} from '@/lib/notifications/server/schemas';

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
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function throwAsTRPCError(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof NotificationServiceError) {
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

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listNotificationsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listNotifications(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch notifications');
      }
    }),
  update: protectedProcedure
    .input(updateNotificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateNotification(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update notification');
      }
    }),
  delete: protectedProcedure
    .input(deleteNotificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteNotification(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete notification');
      }
    }),
  bulkUpdate: protectedProcedure
    .input(bulkNotificationsInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkUpdateNotifications(ctx, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update notifications');
      }
    }),
});
