import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

    const session = await auth.session.create({ userId: user.id });

    const res = NextResponse.json({ success: true, message: "Login successful" });
    res.cookies.set(auth.session.cookie.name, session.id, auth.session.cookie.attributes);

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
