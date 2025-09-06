import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cities } from '@/lib/db/schema/locations';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateId = searchParams.get('stateId');

  if (!stateId) {
    return NextResponse.json({ error: 'stateId is required' }, { status: 400 });
  }

  try {
    const stateCities = await db.select().from(cities).where(eq(cities.stateId, parseInt(stateId, 10)));
    return NextResponse.json(stateCities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
