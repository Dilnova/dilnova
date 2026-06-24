import { db } from '@/shared/db/client';
import { auditLogs } from '@/shared/db/schema';
import { logger, redactSensitiveData } from '@/shared/logging/logger';
import { headers } from 'next/headers';

export interface AuditLogParams {
  userId: string;
  action: string;
  targetType: 'category' | 'product' | 'system_setting' | 'membership' | 'vendor' | 'pricing_plan' | 'contact' | 'supplier' | 'inventory' | 'simulated_order' | 'branch' | 'billing_receipt' | 'data_subject_request';
  targetId: string;
  metadata?: Record<string, unknown> | null;
  strict?: boolean;
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
  strict = false,
}: AuditLogParams) {
  const redactedMetadata = metadata ? redactSensitiveData(metadata) : null;
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    ipAddress = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : headersList.get('x-real-ip') || null;
    userAgent = headersList.get('user-agent') || null;
  } catch {
    // Ignore error if headers() is called outside of request context (e.g. background tasks or tests)
  }

  try {
    // Write redacted metadata to the database to avoid storing raw PII
    await db.insert(auditLogs).values({
      userId,
      action,
      targetType,
      targetId,
      metadata: redactedMetadata,
      ipAddress,
      userAgent,
    });

    // Log redacted metadata to avoid leaking PII into monitoring systems
    logger.info(`Audit log created: ${action}`, {
      userId,
      action,
      targetType,
      targetId,
      metadata: redactedMetadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error(`Failed to write audit log for ${action}`, error, {
      userId,
      action,
      targetType,
      targetId,
      metadata: redactedMetadata,
      ipAddress,
      userAgent,
    });

    if (strict) {
      throw new Error(`Audit Log Failure: Failed to persist audit trail for critical action '${action}'.`);
    }
  }
}
