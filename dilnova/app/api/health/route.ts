import { db } from '@/shared/db/client';
import { sql } from 'drizzle-orm';
import { logger } from '@/shared/logging/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { probeUpstashRateLimit } from '@/shared/security/upstash-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  return runWithCorrelationId(async () => {
    const rateLimit = await probeUpstashRateLimit();

    try {
      // Ping database to confirm connectivity
      await db.execute(sql`SELECT 1`);

      const productionNeedsUpstash =
        process.env.NODE_ENV === 'production' && rateLimit.status !== 'ok';

      return Response.json(
        {
          status: productionNeedsUpstash ? 'degraded' : 'ok',
          timestamp: new Date().toISOString(),
          database: 'connected',
          rateLimit,
        },
        { status: productionNeedsUpstash ? 503 : 200 }
      );
    } catch (error) {
      logger.error('Health check failed', error);

      return Response.json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          rateLimit,
          error: process.env.NODE_ENV === 'production'
            ? 'Internal database connection failed.'
            : (error instanceof Error ? error.message : 'Unknown error'),
        },
        { status: 500 }
      );
    }
  });
}
