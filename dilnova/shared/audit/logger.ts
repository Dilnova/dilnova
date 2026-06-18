import { db } from '@/shared/db/client';
import { auditLogs } from '@/shared/db/schema';
import { logger, redactSensitiveData } from '@/shared/logging/logger';

export interface AuditLogParams {
  userId: string;
  action: string;
  targetType: 'category' | 'product' | 'system_setting' | 'membership' | 'vendor' | 'pricing_plan' | 'contact' | 'supplier' | 'inventory' | 'simulated_order' | 'branch' | 'billing_receipt';
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
  const redactedMetadata = metadata ? redactSensitiveData(metadata) : null;

  try {
    // Write raw metadata to the database for forensic auditing
    await db.insert(auditLogs).values({
      userId,
      action,
      targetType,
      targetId,
      metadata: metadata,
    });

    // Log redacted metadata to avoid leaking PII into monitoring systems
    logger.info(`Audit log created: ${action}`, {
      userId,
      action,
      targetType,
      targetId,
      metadata: redactedMetadata,
    });
  } catch (error) {
    logger.error(`Failed to write audit log for ${action}`, error, {
      userId,
      action,
      targetType,
      targetId,
      metadata: redactedMetadata,
    });
  }
}
