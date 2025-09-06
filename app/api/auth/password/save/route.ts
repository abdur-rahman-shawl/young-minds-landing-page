import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import bcrypt from "bcryptjs";
import { sendVerificationOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const { id, email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: "Email, password, and name are required" }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user (fail if email already registered)
    await db.insert(users).values({
      id,
      email,
      name,
      passwordHash: passwordHash,
      authenticationProvider: 'PASSWORD'
    });

    // Send verification OTP
    await sendVerificationOtp(email);

    return NextResponse.json({ success: true, message: "User registered successfully" });
  } catch (err: any) {
    console.error("Register error:", err);

    if (err.code === "23505") { // unique_violation in Postgres
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
