import { createTRPCRouter } from '../init';
import { adminRouter } from './admin';
import { analyticsRouter } from './analytics';
import { bookingsRouter } from './bookings';
import { contentRouter } from './content';
import { learningRouter } from './learning';
import { messagingRouter } from './messaging';
import { mentorRouter } from './mentor';
import { notificationsRouter } from './notifications';
import { profileRouter } from './profile';
import { subscriptionsRouter } from './subscriptions';

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  analytics: analyticsRouter,
  bookings: bookingsRouter,
  content: contentRouter,
  learning: learningRouter,
  messaging: messagingRouter,
  mentor: mentorRouter,
  notifications: notificationsRouter,
  profile: profileRouter,
  subscriptions: subscriptionsRouter,
});

export type AppRouter = typeof appRouter;
