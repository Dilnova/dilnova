import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/shared/db/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing in .env.local');
}

// Disable prefetch because Supabase/Neon connection poolers do not support it in transaction mode
const client = postgres(connectionString, {
  prepare: false,
  max: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? 2 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
