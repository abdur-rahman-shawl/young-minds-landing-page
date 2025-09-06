import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { countries } from '@/lib/db/schema/locations';

export async function GET() {
  try {
    const allCountries = await db.select().from(countries);
    return NextResponse.json(allCountries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
