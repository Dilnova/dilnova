import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock drizzle-orm to avoid loading real package
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

// Mock DB
const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({
  limit: mockSelectLimit,
}));
const mockSelectFrom = vi.fn(() => ({
  where: mockSelectWhere,
}));
const mockSelect = vi.fn(() => ({
  from: mockSelectFrom,
}));

const mockUpdateWhere = vi.fn(() => Promise.resolve());
const mockUpdateSet = vi.fn(() => ({
  where: mockUpdateWhere,
}));
const mockUpdate = vi.fn(() => ({
  set: mockUpdateSet,
}));

vi.mock('@/shared/db/client', () => ({
  db: {
    select: () => mockSelect(),
    update: () => mockUpdate(),
  },
}));

// Mock Clerk
const mockGetUserList = vi.fn();
const mockUpdateUserMetadata = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() => Promise.resolve({
    users: {
      getUserList: () => mockGetUserList(),
      updateUserMetadata: () => mockUpdateUserMetadata(),
    },
  })),
}));

// Mock Superadmin Guard & Server Helpers
vi.mock('@/shared/auth/superadmin-guard', () => ({
  checkSuperAdmin: vi.fn(() => Promise.resolve({ id: 'admin_user_id' })),
}));

vi.mock('@/shared/auth/superadmin.server', () => ({
  isSuperAdminUser: vi.fn(() => false),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock logger to prevent @sentry/node import block in sandbox
vi.mock('@/shared/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  redactSensitiveData: vi.fn((x) => x),
}));

// Mock Async Context, Rate Limit, Audit logging
vi.mock('@/shared/security/async-context', () => ({
  runWithCorrelationId: (fn: any) => fn(),
}));

vi.mock('@/shared/security/rate-limit', () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/shared/audit/logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

import { updateContactStatusAction } from '@/features/superadmin/actions';

describe('updateContactStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid UUID format for id', async () => {
    await expect(updateContactStatusAction('invalid-uuid', 'connected')).rejects.toThrow('Invalid ID format.');
  });

  it('performs query and update when valid UUID is passed', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    mockSelectLimit.mockResolvedValueOnce([{ email: 'test@example.com' }]);
    mockGetUserList.mockResolvedValueOnce({ data: [] }); // No user to sync

    const result = await updateContactStatusAction(validUuid, 'connected');

    expect(result.success).toBe(true);
    expect(mockSelectLimit).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalled();
  });
});
