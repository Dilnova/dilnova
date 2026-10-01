import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/shared/db/schema";
import { env } from "@/shared/config/env";

const connectionString = env.database.url;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing in .env.local");
}

// Disable prefetch because Supabase/Neon connection poolers do not support it in transaction mode
const defaultPoolSize = env.database.isServerless ? 10 : 10;

const poolSize = env.database.poolSize ?? defaultPoolSize;

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
    // Force SSL for non-local connections regardless of NODE_ENV to prevent
    // cleartext credentials/data transmission and abrupt connection drops.
    ssl:
      !connectionString.includes("127.0.0.1") &&
      !connectionString.includes("localhost") &&
      env.database.ssl
        ? "require"
        : false,
  });

globalForDb.postgresClient = client;

import { logger } from "@/shared/logging/logger";
import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";

function withSlowQueryLogger(client: PostgresClient): PostgresClient {
  return new Proxy(client, {
    get(target, prop) {
      const orig = target[prop as keyof typeof target];
      if (prop === "unsafe") {
        return (query: string, params?: Parameters<PostgresClient["unsafe"]>[1]) => {
          const start = performance.now();

          let span: ReturnType<NonNullable<typeof Sentry.startInactiveSpan>> | undefined;
          if (env.app.isProduction && (env.sentry.dsn || env.sentry.publicDsn)) {
            try {
              if (Sentry.startInactiveSpan) {
                span = Sentry.startInactiveSpan({
                  name: "DB Query",
                  op: "db.query",
                  attributes: {
                    "db.statement":
                      query.length > 200 ? `${query.slice(0, 200)}... [truncated]` : query,
                  },
                });
              }
            } catch {
              // ignore
            }
          }

          const result = (orig as PostgresClient["unsafe"]).call(target, query, params);

          const finish = (error?: unknown) => {
            const duration = performance.now() - start;
            if (duration > 500) {
              const paramCount = Array.isArray(params)
                ? params.length
                : params !== undefined && params !== null
                  ? 1
                  : 0;

              const normalized = query.replace(/\s+/g, " ").trim();
              const queryHash = crypto
                .createHash("sha256")
                .update(normalized)
                .digest("hex")
                .slice(0, 12);

              const isProd = env.app.isProduction;
              const maxLen = isProd ? 160 : 300;
              const sanitizedQuery =
                normalized.length > maxLen
                  ? `${normalized.slice(0, maxLen)}... [truncated]`
                  : normalized;

              logger.warn(`[Slow Query ${duration.toFixed(2)}ms]`, {
                query: sanitizedQuery,
                queryHash,
                paramCount,
              });
              if (span) {
                span.setAttribute("slow", true);
                span.setAttribute("db.query_hash", queryHash);
              }
            }
            if (span) {
              if (error) {
                span.setStatus({ code: 2, message: "internal_error" });
              }
              span.end();
            }
          };

          const wrappedResult = Object.assign(
            result
              .then((res: unknown) => {
                finish();
                return res;
              })
              .catch((err: unknown) => {
                finish(err);
                throw err;
              }),
            {
              values: () => {
                return result
                  .values()
                  .then((res: unknown) => {
                    finish();
                    return res;
                  })
                  .catch((err: unknown) => {
                    finish(err);
                    throw err;
                  });
              },
            },
          );

          return wrappedResult;
        };
      }

      if (prop === "begin" || prop === "savepoint") {
        return (cb: (tx: PostgresClient) => unknown) => {
          const txFn = orig as (
            callback: (tx: PostgresClient) => unknown,
          ) => ReturnType<PostgresClient["begin"]>;
          return txFn.call(target, (txClient: PostgresClient) => {
            return cb(withSlowQueryLogger(txClient));
          });
        };
      }

      return typeof orig === "function" ? (orig as CallableFunction).bind(target) : orig;
    },
  }) as PostgresClient;
}

export const db = drizzle(withSlowQueryLogger(client), {
  schema,
  logger: env.app.isDevelopment
    ? {
        logQuery(query: string, params: unknown[]) {
          logger.info(`[DB Query]`, {
            query,
            params: params.map((p) =>
              typeof p === "string" && p.includes("@") ? "[REDACTED_EMAIL]" : p,
            ),
          });
        },
      }
    : undefined,
});
