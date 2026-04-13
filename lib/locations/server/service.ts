import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cities, countries, states } from '@/lib/db/schema/locations';

export async function listCountries() {
  return db.select().from(countries);
}

export async function listStatesByCountryId(countryId: number) {
  return db.select().from(states).where(eq(states.countryId, countryId));
}

export async function listCitiesByStateId(stateId: number) {
  return db.select().from(cities).where(eq(cities.stateId, stateId));
}
