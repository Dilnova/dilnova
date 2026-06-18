import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAuditAction } from '@/shared/audit/logger';
import { db } from '@/shared/db/client';
import { logger } from '@/shared/logging/logger';
import { auditLogs } from '@/shared/db/schema';

vi.mock('@/shared/db/client', () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock('@/shared/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  redactSensitiveData: (val: any) => {
    if (val && typeof val === 'object') {
      const copy = { ...val };
      if ('email' in copy) copy.email = '[REDACTED]';
      return copy;
    }
    return val;
  },
}));

describe('logAuditAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists raw unredacted metadata to the database but logs redacted metadata to stdout', async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const sensitiveMetadata = {
      email: 'sensitive-user@example.com',
      itemId: 'item_123',
    };

    await logAuditAction({
      userId: 'user_test',
      action: 'test_action',
      targetType: 'product',
      targetId: 'prod_123',
      metadata: sensitiveMetadata,
    });

    // Verify raw metadata went to the database
    expect(db.insert).toHaveBeenCalledWith(auditLogs);
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'user_test',
      action: 'test_action',
      targetType: 'product',
      targetId: 'prod_123',
      metadata: sensitiveMetadata, // raw / unredacted
    });

    // Verify redacted metadata went to stdout logger
    expect(logger.info).toHaveBeenCalledWith(
      'Audit log created: test_action',
      expect.objectContaining({
        userId: 'user_test',
        action: 'test_action',
        targetType: 'product',
        targetId: 'prod_123',
        metadata: {
          email: '[REDACTED]',
          itemId: 'item_123',
        },
      })
    );
  });

  it('handles database insertion error by logging redacted metadata via logger.error', async () => {
    const dbError = new Error('Database connection failed');
    const mockValues = vi.fn().mockRejectedValue(dbError);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const sensitiveMetadata = {
      email: 'sensitive-user@example.com',
      itemId: 'item_123',
    };

    await logAuditAction({
      userId: 'user_test',
      action: 'test_action',
      targetType: 'product',
      targetId: 'prod_123',
      metadata: sensitiveMetadata,
    });

    // Logger.error should be called with redacted metadata
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to write audit log for test_action',
      dbError,
      expect.objectContaining({
        userId: 'user_test',
        action: 'test_action',
        targetType: 'product',
        targetId: 'prod_123',
        metadata: {
          email: '[REDACTED]',
          itemId: 'item_123',
        },
      })
    );
  });
});
