import { createTRPCRouter } from '../init';
import { messagingRouter } from './messaging';

export const appRouter = createTRPCRouter({
  messaging: messagingRouter,
});

export type AppRouter = typeof appRouter;
