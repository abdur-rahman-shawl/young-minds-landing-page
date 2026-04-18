import { createTRPCRouter, userProcedure } from '../init';
import {
  getCurrentUserProfile,
  upsertCurrentMenteeProfile,
} from '@/lib/profile/server/service';
import { upsertMenteeProfileInputSchema } from '@/lib/profile/server/schemas';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

export const profileRouter = createTRPCRouter({
  me: userProcedure.query(async ({ ctx }) => {
    try {
      return await getCurrentUserProfile(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch user profile');
    }
  }),
  upsertMenteeProfile: userProcedure
    .input(upsertMenteeProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertCurrentMenteeProfile(
          ctx.userId,
          input,
          ctx.currentUser
        );
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update mentee profile');
      }
    }),
});
