import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema/locations";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const activeCountries = await db
      .select({
        id: countries.id,
        name: countries.name,
        code: countries.code,
      })
      .from(countries)
      .where(eq(countries.isActive, true))
      .orderBy(countries.name); // Sort alphabetically

    return NextResponse.json(activeCountries);
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}