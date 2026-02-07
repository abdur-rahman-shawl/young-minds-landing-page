import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Postgres } from 'postgres';
import type { DrizzleClient } from 'drizzle-orm';
import * as schema from './schema';

// Ensure this only runs on server-side
if (typeof window !== 'undefined') {
  throw new Error('Database connection cannot be used on client-side');
}

declare global {
  var __youngMindsDb: {
    db: DrizzleClient;
    client: Postgres;
  } | undefined;
}

function initializeDatabase() {
  if (global.__youngMindsDb) {
    return global.__youngMindsDb;
  }

  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (error) {
    // Environment variables should be available in production anyway
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(client, { schema });

  global.__youngMindsDb = { db, client } as unknown as typeof global.__youngMindsDb;
  return global.__youngMindsDb as Required<typeof global.__youngMindsDb>;
}

const { db: database, client: pgClient } = initializeDatabase();

export const db = database;
export const client = pgClient;

// For migrations and other utilities
export * from './schema'; 
