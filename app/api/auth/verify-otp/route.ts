import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailVerifications } from "@/lib/db/schema/email-verifications";
import { and, eq, gt, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Email and OTP required" }, { status: 400 });
    }

    // Atomically delete the row only if:
    //  - email matches
    //  - code matches
    //  - expiresAt is still in the future relative to the DB server's time (now())
    const deleted = await db
      .delete(emailVerifications)
      .where(and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.code, Number(otp)),
        gt(emailVerifications.expiresAt, sql`now()`) // DB clock, not Node clock
      ))
      .returning({ id: emailVerifications.id });

    if (deleted.length === 0) {
      // Either no match, wrong OTP, or expired
      return NextResponse.json({ success: false, error: "Invalid or expired OTP" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
