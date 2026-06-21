import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserMemberOfOrganization } from '@/shared/auth/org-membership.server';
import { clerkClient } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

describe('isUserMemberOfOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the user is listed in the organization memberships', async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({
          data: [
            {
              publicUserData: { userId: 'user_vendor' },
            },
          ],
          totalCount: 1,
        }),
      },
    } as never);

    await expect(isUserMemberOfOrganization('user_vendor', 'org_abc')).resolves.toBe(true);
  });

  it('returns false when the user is not a member', async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({
          data: [
            {
              publicUserData: { userId: 'user_other' },
            },
          ],
          totalCount: 1,
        }),
      },
    } as never);

    await expect(isUserMemberOfOrganization('user_customer', 'org_abc')).resolves.toBe(false);
  });

  it('paginates membership results when needed', async () => {
    const getOrganizationMembershipList = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, index) => ({
          publicUserData: { userId: `user_${index}` },
        })),
        totalCount: 101,
      })
      .mockResolvedValueOnce({
        data: [{ publicUserData: { userId: 'user_target' } }],
        totalCount: 101,
      });

    vi.mocked(clerkClient).mockResolvedValue({
      organizations: { getOrganizationMembershipList },
    } as never);

    await expect(isUserMemberOfOrganization('user_target', 'org_abc')).resolves.toBe(true);
    expect(getOrganizationMembershipList).toHaveBeenCalledTimes(2);
  });
});
