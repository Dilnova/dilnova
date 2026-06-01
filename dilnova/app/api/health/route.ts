import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ping database to confirm connectivity
    await db.execute(sql`SELECT 1`);
    
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed', error);
    
    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
