import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { id, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user (fail if email already registered)
    await db.insert(users).values({
      id,
      email,
      passwordHash: passwordHash,
      authenticationProvider: 'PASSWORD'
    });

    return NextResponse.json({ success: true, message: "User registered successfully" });
  } catch (err: any) {
    console.error("Register error:", err);

    if (err.code === "23505") { // unique_violation in Postgres
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
