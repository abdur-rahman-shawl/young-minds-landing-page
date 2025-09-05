import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { states, countries } from "@/lib/db/schema/locations";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { countryCode: string } }
) {
  const { countryCode } = params;

  if (!countryCode) {
    return NextResponse.json(
      { message: "Country code is required" },
      { status: 400 }
    );
  }

  try {
    const activeStates = await db
      .select({
        id: states.id,
        name: states.name,
        code: states.code,
      })
      .from(states)
      .innerJoin(countries, eq(states.countryId, countries.id))
      .where(
        and(
          eq(countries.code, countryCode.toUpperCase()),
          eq(states.isActive, true),
          eq(countries.isActive, true) // Ensure the parent country is also active
        )
      )
      .orderBy(states.name);

    return NextResponse.json(activeStates);
  } catch (error) {
    console.error("Failed to fetch states:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}