import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { toggleUserRoleAction } from '@/features/auth/actions';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@/shared/audit/logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

describe('toggleUserRoleAction', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should throw a forbidden error in production environments', async () => {
    process.env.NODE_ENV = 'production';

    await expect(toggleUserRoleAction('vendor')).rejects.toThrow(
      'Forbidden: Role toggling is disabled in production environments.'
    );
  });

  it('should throw an unauthorized error when no user is signed in', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    await expect(toggleUserRoleAction('vendor')).rejects.toThrow(
      'Not authorized: You must be logged in to toggle your role.'
    );
  });

  it('should toggle from customer to vendor and update public metadata', async () => {
    const mockUpdateUserMetadata = vi.fn();
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        updateUserMetadata: mockUpdateUserMetadata,
      },
    } as any);

    const result = await toggleUserRoleAction('customer');

    expect(result).toEqual({ success: true, nextRole: 'vendor' });
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith('user_123', {
      publicMetadata: { role: 'vendor' },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/admin');
  });

  it('should toggle from vendor to customer and update public metadata', async () => {
    const mockUpdateUserMetadata = vi.fn();
    vi.mocked(auth).mockResolvedValue({ userId: 'user_456' } as any);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        updateUserMetadata: mockUpdateUserMetadata,
      },
    } as any);

    const result = await toggleUserRoleAction('vendor');

    expect(result).toEqual({ success: true, nextRole: 'customer' });
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith('user_456', {
      publicMetadata: { role: 'customer' },
    });
  });
});
