import { createTRPCRouter } from '../init';
import { bookingsRouter } from './bookings';
import { contentRouter } from './content';
import { messagingRouter } from './messaging';
import { notificationsRouter } from './notifications';

export const appRouter = createTRPCRouter({
  bookings: bookingsRouter,
  content: contentRouter,
  messaging: messagingRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
