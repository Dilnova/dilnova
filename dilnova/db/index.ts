import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing in .env.local');
}

// Disable prefetch because Supabase/Neon connection poolers do not support it in transaction mode
const client = postgres(connectionString, {
  prepare: false,
  max: 10,         // Connection pool size limit
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // 10 second timeout for establishing connection
});

export const db = drizzle(client, { schema });
