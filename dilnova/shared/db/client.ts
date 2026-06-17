import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/shared/db/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing in .env.local');
}

// Disable prefetch because Supabase/Neon connection poolers do not support it in transaction mode
const poolSize = process.env.DATABASE_POOL_SIZE
  ? parseInt(process.env.DATABASE_POOL_SIZE, 10)
  : 10;

const client = postgres(connectionString, {
  prepare: false,
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
