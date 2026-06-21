import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/shared/db/client';
import { logger } from '@/shared/logging/logger';
import { auditLogs } from '@/shared/db/schema';

const { mockHeaders } = vi.hoisted(() => ({
  mockHeaders: new Map<string, string>(),
}));

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({
    get: (key: string) => mockHeaders.get(key) || null,
  }),
}));

import { logAuditAction } from '@/shared/audit/logger';

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
    mockHeaders.clear();
  });

  it('persists redacted metadata to the database and logs redacted metadata to stdout', async () => {
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

    // Verify redacted metadata went to the database with null IP and UA
    expect(db.insert).toHaveBeenCalledWith(auditLogs);
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'user_test',
      action: 'test_action',
      targetType: 'product',
      targetId: 'prod_123',
      metadata: {
        email: '[REDACTED]',
        itemId: 'item_123',
      },
      ipAddress: null,
      userAgent: null,
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
        ipAddress: null,
        userAgent: null,
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
        ipAddress: null,
        userAgent: null,
      })
    );
  });

  it('extracts IP address and user-agent from headers and stores them', async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    mockHeaders.set('x-forwarded-for', '203.0.113.195, 70.41.3.18');
    mockHeaders.set('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

    await logAuditAction({
      userId: 'user_test',
      action: 'test_action',
      targetType: 'product',
      targetId: 'prod_123',
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '203.0.113.195',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      })
    );
  });

  it('throws an error on database insertion failure when strict is true', async () => {
    const dbError = new Error('Database connection failed');
    const mockValues = vi.fn().mockRejectedValue(dbError);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    await expect(
      logAuditAction({
        userId: 'user_test',
        action: 'test_action',
        targetType: 'product',
        targetId: 'prod_123',
        strict: true,
      })
    ).rejects.toThrowError(/Audit Log Failure/);

    expect(logger.error).toHaveBeenCalled();
  });
});
