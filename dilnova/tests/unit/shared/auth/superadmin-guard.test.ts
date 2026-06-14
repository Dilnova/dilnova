/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { currentUser } from '@clerk/nextjs/server';

// Mock Clerk server methods
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

describe('authGuards - checkSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when user is not logged in (session is null)', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await expect(checkSuperAdmin()).rejects.toThrow('Unauthorized: You must be logged in.');
  });

  it('should throw when user is logged in but role is not admin', async () => {
    const mockUser = {
      id: 'user_customer_123',
      publicMetadata: {
        role: 'customer',
      },
    };
    vi.mocked(currentUser).mockResolvedValue(mockUser as any);

    await expect(checkSuperAdmin()).rejects.toThrow('Unauthorized: Only global administrators can perform this action.');
  });

  it('should return user details successfully when user has the admin role', async () => {
    const mockUser = {
      id: 'user_admin_999',
      publicMetadata: {
        role: 'admin',
      },
    };
    vi.mocked(currentUser).mockResolvedValue(mockUser as any);

    const user = await checkSuperAdmin();
    expect(user).toEqual(mockUser);
  });
});
