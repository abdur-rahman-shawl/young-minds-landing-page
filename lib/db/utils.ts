import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Get database version and info
 */
export async function getDatabaseInfo() {
  try {
    const result = await db.execute(sql`SELECT version()`);
    return result[0];
  } catch (error) {
    console.error('Error getting database info:', error);
    throw error;
  }
}

// Add more utility functions as needed
export const dbUtils = {
  testConnection,
  getDatabaseInfo,
}; 