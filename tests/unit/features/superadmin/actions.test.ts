import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
const mockAuth = vi.fn();
const mockGetUser = vi.fn();
const mockGetUserList = vi.fn();
const mockUpdateUserMetadata = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  clerkClient: vi.fn(() => Promise.resolve({
    users: {
      getUser: () => mockGetUser(),
      getUserList: () => mockGetUserList(),
      updateUserMetadata: () => mockUpdateUserMetadata(),
    },
  })),
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
  const originalAllowlist = process.env.SUPERADMIN_USER_IDS;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up happy path defaults for the real guard
    process.env.SUPERADMIN_USER_IDS = 'admin_user_id';
    mockAuth.mockResolvedValue({ userId: 'admin_user_id' });
    mockGetUser.mockResolvedValue({
      id: 'admin_user_id',
      privateMetadata: { platformRole: 'superadmin' },
    });
  });

  afterEach(() => {
    if (originalAllowlist) {
      process.env.SUPERADMIN_USER_IDS = originalAllowlist;
    } else {
      delete process.env.SUPERADMIN_USER_IDS;
    }
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

  it('rejects with an authorization error when user is unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    await expect(updateContactStatusAction(validUuid, 'connected')).rejects.toThrow('Unauthorized');
  });

  it('rejects when privateMetadata fails but env allowlist passes', async () => {
    // env allowlist still has 'admin_user_id' from beforeEach
    mockGetUser.mockResolvedValue({
      id: 'admin_user_id',
      privateMetadata: {}, // no platformRole: superadmin
    });
    
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    await expect(updateContactStatusAction(validUuid, 'connected')).rejects.toThrow('Unauthorized');
  });

  it('rejects when env allowlist fails but privateMetadata passes', async () => {
    // wipe the allowlist
    process.env.SUPERADMIN_USER_IDS = '';
    
    // privateMetadata still has platformRole from beforeEach
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    await expect(updateContactStatusAction(validUuid, 'connected')).rejects.toThrow('Unauthorized');
  });
});
