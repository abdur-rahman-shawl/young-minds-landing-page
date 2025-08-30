// /pages/api/auth/send-otp.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/db"; // your drizzle db client
import { emailVerifications } from "@/lib/db/schema/email-verifications";
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';

export async function POST(req: NextRequest) {

  const { email } = await req.json();


  try {
    // 1. Generate 6-digit OTP
   const otp = randomInt(100000, 999999);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins from now

    // 2. UPSERT into DB (overwrite if email already exists)
    await db
      .insert(emailVerifications)
      .values({ email, code: otp, expiresAt })
      .onConflictDoUpdate({
        target: emailVerifications.email,
        set: { code: otp, expiresAt, createdAt: new Date() },
      });

    // 3. Send OTP email via Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_APP_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Sharing Minds" <${process.env.GMAIL_APP_USER}>`,
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


     return NextResponse.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (err: any) {
    console.error("Error sending OTP:", err);

    return NextResponse.json(
      { success: false, error: 'Failed to send OTP: ' },
      { status: 500 }
    );
  }
}
