import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cities, states, countries } from "@/lib/db/schema/locations";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { countryCode: string; stateCode: string } }
) {
  const { countryCode, stateCode } = params;

  if (!countryCode || !stateCode) {
    return NextResponse.json(
      { message: "Country and state codes are required" },
      { status: 400 }
    );
  }

  try {
    const activeCities = await db
      .select({
        id: cities.id,
        name: cities.name,
      })
      .from(cities)
      .innerJoin(states, eq(cities.stateId, states.id))
      .innerJoin(countries, eq(states.countryId, countries.id))
      .where(
        and(
          // Match the provided codes
          eq(countries.code, countryCode.toUpperCase()),
          eq(states.code, stateCode.toUpperCase()),
          // Ensure the entire hierarchy is active
          eq(countries.isActive, true),
          eq(states.isActive, true),
          eq(cities.isActive, true)
        )
      )
      .orderBy(cities.name);

    return NextResponse.json(activeCities);
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}