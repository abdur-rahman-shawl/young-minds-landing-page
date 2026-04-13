import { z } from 'zod';

import {
  getRecordingPlaybackUrl,
  getSessionAccessToken,
  listSessionRecordings,
} from '@/lib/recordings/server/service';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

import { createTRPCRouter, protectedProcedure } from '../init';

export const recordingsRouter = createTRPCRouter({
  accessToken: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getSessionAccessToken(input.sessionId, ctx.userId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to generate access token');
      }
    }),
  listForSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listSessionRecordings(input.sessionId, ctx.userId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to list recordings');
      }
    }),
  playbackUrl: protectedProcedure
    .input(
      z.object({
        recordingId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getRecordingPlaybackUrl(input.recordingId, ctx.userId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to generate playback URL');
      }
    }),
});
