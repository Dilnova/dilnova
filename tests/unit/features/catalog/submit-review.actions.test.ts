import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitReviewAction } from '@/features/catalog/product-detail.actions';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/shared/db/client';
import { rateLimit } from '@/shared/security/rate-limit';
import { isUserMemberOfOrganization } from '@/shared/auth/org-membership.server';
import { hasCustomerPurchasedProduct } from '@/features/catalog/verified-buyer';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock('@/shared/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/security/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/shared/auth/org-membership.server', () => ({
  isUserMemberOfOrganization: vi.fn(),
}));

vi.mock('@/features/catalog/verified-buyer', () => ({
  hasCustomerPurchasedProduct: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

const productId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const orgId = 'org_vendor_123';

function createSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

describe('submitReviewAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(undefined);
    vi.mocked(auth).mockResolvedValue({ userId: 'user_vendor' } as never);
    vi.mocked(currentUser).mockResolvedValue({
      id: 'user_vendor',
      firstName: 'Vendor',
      lastName: 'User',
      username: null,
      imageUrl: '',
      primaryEmailAddress: { emailAddress: 'vendor@example.com' },
      emailAddresses: [{ emailAddress: 'vendor@example.com' }],
    } as never);
  });

  it('blocks vendor org members even when no active organization is in session', async () => {
    vi.mocked(db.select).mockReturnValue(createSelectChain([{ orgId }]) as never);
    vi.mocked(isUserMemberOfOrganization).mockResolvedValue(true);

    const result = await submitReviewAction({ productId, rating: 5, comment: 'Great product' });

    expect(result?.serverError).toBe('Vendor members cannot review their own products.');

    expect(isUserMemberOfOrganization).toHaveBeenCalledWith('user_vendor', orgId);
    expect(hasCustomerPurchasedProduct).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('allows non-members who verified purchase to submit a review', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createSelectChain([{ orgId }]) as never)
      .mockReturnValueOnce(createSelectChain([]) as never);
    vi.mocked(isUserMemberOfOrganization).mockResolvedValue(false);
    vi.mocked(hasCustomerPurchasedProduct).mockResolvedValue(true);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as never);

    const result = await submitReviewAction({ productId, rating: 5, comment: 'Legit review' });

    expect(result?.data?.success).toBe(true);
    expect(hasCustomerPurchasedProduct).toHaveBeenCalledWith(productId, 'user_vendor');
    expect(db.insert).toHaveBeenCalled();
  });
});
