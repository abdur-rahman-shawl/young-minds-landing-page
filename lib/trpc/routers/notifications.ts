import { createTRPCRouter, protectedProcedure } from '../init';
import {
  bulkUpdateNotifications,
  deleteNotification,
  listNotifications,
  updateNotification,
} from '@/lib/notifications/server/service';
import {
  bulkNotificationsInputSchema,
  deleteNotificationInputSchema,
  listNotificationsInputSchema,
  updateNotificationInputSchema,
} from '@/lib/notifications/server/schemas';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

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
