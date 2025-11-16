import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Ensure this only runs on server-side
if (typeof window !== 'undefined') {
  throw new Error('Database connection cannot be used on client-side');
}

// Only initialize database in server environment
let dbInstance: any;
let clientInstance: any;

function initializeDatabase() {
  if (dbInstance && clientInstance) {
    return { db: dbInstance, client: clientInstance };
  }

  // Load environment variables only on server
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (error) {
    // Environment variables should be available in production anyway
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  // Create the connection
  const connectionString = process.env.DATABASE_URL;

  // Disable prefetch as it's not supported for "Transaction" pool mode
  clientInstance = postgres(connectionString, { prepare: false });

  // CRITICAL: Pass schema to enable query API (db.query.*)
  dbInstance = drizzle(clientInstance, { schema });

  return { db: dbInstance, client: clientInstance };
}

// Initialize and export
const { db: database, client: pgClient } = initializeDatabase();

export const db = database;
export const client = pgClient;

// For migrations and other utilities
export * from './schema'; 