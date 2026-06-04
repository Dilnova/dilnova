import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { logger } from './logger';

export interface AuditLogParams {
  userId: string;
  action: string;
  targetType: 'category' | 'product' | 'system_setting' | 'membership' | 'vendor' | 'pricing_plan' | 'contact';
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Persists an administrative or critical action to the database audit trail
 * and prints a structured log.
 */
export async function logAuditAction({
  userId,
  action,
  targetType,
  targetId,
  metadata = null,
}: AuditLogParams) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      targetType,
      targetId,
      metadata,
    });
    
    logger.info(`Audit log created: ${action}`, {
      userId,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch (error) {
    logger.error(`Failed to write audit log for ${action}`, error, {
      userId,
      action,
      targetType,
      targetId,
      metadata,
    });
  }
}
