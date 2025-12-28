import { db } from "@/lib/db";
import { emailVerifications } from "@/lib/db/schema/email-verifications";
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { recordEmailEvent } from '@/lib/audit';
import { eq } from 'drizzle-orm';

export async function sendVerificationOtp(email: string) {
  try {
    const otp = randomInt(100000, 999999);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins from now

    const existingVerification = await db
      .select({ email: emailVerifications.email })
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email))
      .limit(1);

    await db
      .insert(emailVerifications)
      .values({ email, code: otp, expiresAt })
      .onConflictDoUpdate({
        target: emailVerifications.email,
        set: { code: otp, expiresAt, createdAt: new Date() },
      });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_APP_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      const action = existingVerification.length > 0
        ? 'email.auth.otp.resend'
        : 'email.auth.otp';

      await recordEmailEvent({
        action,
        to: email,
        subject: 'Your Verification Code',
        template: 'auth-otp',
        actorType: 'system',
        details: {
          otp,
        },
      });
    } catch (error) {
      console.error('Failed to record OTP email audit event:', error);
    }

    await transporter.sendMail({
      from: `"SharingMinds" <${process.env.GMAIL_APP_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Thank you for signing up. Please use the following code to verify your email address:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
            ${otp}
          </p>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    return { success: true, message: 'OTP sent successfully' };
  } catch (err: any) {
    console.error("Error sending OTP:", err);
    return { success: false, error: 'Failed to send OTP' };
  }
}
