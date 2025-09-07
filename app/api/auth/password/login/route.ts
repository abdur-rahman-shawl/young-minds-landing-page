import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, betterAuthSessions } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHMAC } from "@better-auth/utils/hmac";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    // Find user
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Incorrect Credentials" }, { status: 401 });
    }

    const user = result[0];

    if (!user.passwordHash) {
        return NextResponse.json({ success: false, error: "Incorrect Credentials" }, { status: 401 });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Incorrect Credentials" }, { status: 401 });
    }

    // Manual session creation
    const sessionToken = nanoid(64);
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const now = new Date();

    await db.insert(betterAuthSessions).values({
      id: sessionToken,
      userId: user.id,
      expiresAt: sessionExpires,
      token: sessionToken,
      createdAt: now,
      updatedAt: now,
    });

    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      throw new Error("BETTER_AUTH_SECRET is not set");
    }
    const signature = await createHMAC("SHA-256", secret, sessionToken);
    const cookieValue = `${sessionToken}.${signature}`;

    const res = NextResponse.json({ success: true, message: "Login successful" });

    res.cookies.set("better-auth.session_token", cookieValue, {
      expires: sessionExpires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}