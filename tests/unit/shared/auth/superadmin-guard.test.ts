import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSuperAdmin, getCurrentSuperAdminUser } from '@/shared/auth/superadmin-guard';
import { auth, clerkClient } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

describe('superadmin-guard', () => {
  const originalAllowlist = process.env.SUPERADMIN_USER_IDS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERADMIN_USER_IDS = 'user_admin';
  });

  afterEach(() => {
    if (originalAllowlist) {
      process.env.SUPERADMIN_USER_IDS = originalAllowlist;
    } else {
      delete process.env.SUPERADMIN_USER_IDS;
    }
  });

  it('checkSuperAdmin loads the user from Clerk and validates privateMetadata', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as never);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: 'user_admin',
          privateMetadata: { platformRole: 'superadmin' },
          publicMetadata: { role: 'vendor' },
        }),
      },
    } as never);

    const user = await checkSuperAdmin();
    expect(user.id).toBe('user_admin');
  });

  it('checkSuperAdmin rejects users without a superadmin grant', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_customer' } as never);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: 'user_customer',
          privateMetadata: {},
          publicMetadata: { role: 'customer' },
        }),
      },
    } as never);

    await expect(checkSuperAdmin()).rejects.toThrow(
      'Unauthorized: Only global administrators can perform this action.'
    );
  });

  it('getCurrentSuperAdminUser returns null when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(getCurrentSuperAdminUser()).resolves.toBeNull();
  });
});
