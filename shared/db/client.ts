import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/shared/db/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing in .env.local');
}

// Disable prefetch because Supabase/Neon connection poolers do not support it in transaction mode
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const defaultPoolSize = isServerless ? 5 : 10;

const poolSize = process.env.DATABASE_POOL_SIZE
  ? parseInt(process.env.DATABASE_POOL_SIZE, 10)
  : defaultPoolSize;

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  postgresClient: PostgresClient | undefined;
};

const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    prepare: false, // Required for Supabase/Neon connection poolers (Transaction Mode)
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: {
      statement_timeout: 10000, // 10 seconds timeout for hanging queries
    },
    // Force SSL in production to prevent abrupt "Connection closed" drops
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
