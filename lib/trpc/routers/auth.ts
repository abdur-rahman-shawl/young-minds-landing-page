import { z } from 'zod';

import { getSessionWithRoles } from '@/lib/auth/server/session-with-roles';
import { AppHttpError } from '@/lib/http/app-error';
import { authRateLimit, rateLimit } from '@/lib/rate-limit';
import {
  normalizeVerificationEmail,
  sendVerificationOtp,
  verifyVerificationOtp,
} from '@/lib/otp';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

import { createTRPCRouter, publicProcedure } from '../init';

const otpSendRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

const otpVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

function enforceOtpSendRateLimit(request: Request, email: string) {
  authRateLimit.check(request);
  otpSendRateLimit.check(request, `otp:send:${email}`);
}

function enforceOtpVerifyRateLimit(request: Request, email: string) {
  authRateLimit.check(request);
  otpVerifyRateLimit.check(request, `otp:verify:${email}`);
}

export const authRouter = createTRPCRouter({
  sessionWithRoles: publicProcedure.query(async ({ ctx }) => {
    try {
      return await getSessionWithRoles(ctx.req.headers);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch session');
    }
  }),
  sendOtp: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email('Invalid email address'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const normalizedEmail = normalizeVerificationEmail(input.email);
        enforceOtpSendRateLimit(ctx.req, normalizedEmail);

        const result = await sendVerificationOtp(normalizedEmail);
        if (!result.success) {
          throw new AppHttpError(500, result.error || 'Failed to send OTP');
        }

        return {
          success: true,
          message: result.message,
        };
      } catch (error) {
        throwAsTRPCError(error, 'Failed to send OTP');
      }
    }),
  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email('Invalid email address'),
        otp: z
          .string()
          .trim()
          .regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const normalizedEmail = normalizeVerificationEmail(input.email);
        enforceOtpVerifyRateLimit(ctx.req, normalizedEmail);
        return await verifyVerificationOtp(normalizedEmail, input.otp);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to verify OTP');
      }
    }),
});
