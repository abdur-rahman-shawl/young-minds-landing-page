import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { states } from '@/lib/db/schema/locations';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryId = searchParams.get('countryId');

  if (!countryId) {
    return NextResponse.json({ error: 'countryId is required' }, { status: 400 });
  }

  try {
    const countryStates = await db.select().from(states).where(eq(states.countryId, parseInt(countryId, 10)));
    return NextResponse.json(countryStates);
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
