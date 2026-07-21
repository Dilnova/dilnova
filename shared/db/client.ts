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
    // Force SSL in production to prevent abrupt "Connection closed" drops, except for local CI
    ssl: process.env.NODE_ENV === 'production' && !connectionString.includes('127.0.0.1') && !connectionString.includes('localhost') ? 'require' : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

import { logger } from '@/shared/logging/logger';

import * as Sentry from '@sentry/nextjs';

function withSlowQueryLogger(client: PostgresClient): PostgresClient {
  return new Proxy(client, {
    get(target, prop) {
      const orig = target[prop as keyof typeof target];
      if (prop === 'unsafe') {
        return (query: string, params?: Parameters<PostgresClient['unsafe']>[1]) => {
          const start = performance.now();
          
          let span: any;
          if (process.env.NODE_ENV === 'production' && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
            try {
              if (Sentry.startInactiveSpan) {
                span = Sentry.startInactiveSpan({ 
                  name: 'DB Query', 
                  op: 'db.query',
                  attributes: { 'db.statement': query }
                });
              }
            } catch {
              // ignore
            }
          }

          const result = (orig as PostgresClient['unsafe']).call(target, query, params);
          
          const finish = (error?: any) => {
            const duration = performance.now() - start;
            if (duration > 500) {
              logger.warn(`[Slow Query ${duration.toFixed(2)}ms]`, { query, params });
              if (span) {
                span.setAttribute('slow', true);
              }
            }
            if (span) {
              if (error) {
                span.setStatus({ code: 2, message: 'internal_error' });
              }
              span.end();
            }
          };

          const wrappedResult = Object.assign(
            result.then((res: unknown) => {
              finish();
              return res;
            }).catch((err: unknown) => {
              finish(err);
              throw err;
            }),
            {
              values: () => {
                return result.values().then((res: unknown) => {
                  finish();
                  return res;
                }).catch((err: unknown) => {
                  finish(err);
                  throw err;
                });
              }
            }
          );

          return wrappedResult;
        };
      }
      
      if (prop === 'begin' || prop === 'savepoint') {
        return (cb: (tx: PostgresClient) => unknown) => {
          const txFn = orig as (callback: (tx: PostgresClient) => unknown) => ReturnType<PostgresClient['begin']>;
          return txFn.call(target, (txClient: PostgresClient) => {
            return cb(withSlowQueryLogger(txClient));
          });
        };
      }

      return typeof orig === 'function' ? (orig as CallableFunction).bind(target) : orig;
    }
  }) as PostgresClient;
}

export const db = drizzle(withSlowQueryLogger(client), { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery(query: string, params: unknown[]) {
      logger.info(`[DB Query]`, { query, params });
    }
  } : undefined
});
