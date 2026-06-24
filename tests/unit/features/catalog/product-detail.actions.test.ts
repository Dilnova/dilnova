import { describe, it, expect, vi, beforeEach } from 'vitest';
import { incrementProductViewsAction } from '@/features/catalog/product-detail.actions';
import { db } from '@/shared/db/client';
import { rateLimit } from '@/shared/security/rate-limit';

// Mock DB client
vi.mock('@/shared/db/client', () => ({
  db: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ id: 'prod_123' }]),
  },
}));

// Mock rate limiting
vi.mock('@/shared/security/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

describe('incrementProductViewsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail validation and return success false for an invalid product UUID format', async () => {
    const result = await incrementProductViewsAction('invalid-uuid-format');
    expect(result).toEqual({ success: false });
    expect(rateLimit).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should call rateLimit and update the database views count for a valid UUID', async () => {
    const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    vi.mocked(rateLimit).mockResolvedValue(undefined);

    const result = await incrementProductViewsAction(validUuid);

    expect(result).toEqual({ success: true });
    expect(rateLimit).toHaveBeenCalledWith(3, 60 * 1000);
    expect(db.update).toHaveBeenCalled();
    expect(db.update().set).toHaveBeenCalled();
    expect(db.update().set().where).toHaveBeenCalled();
  });

  it('should catch errors and return success false if rate limit is exceeded', async () => {
    const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    vi.mocked(rateLimit).mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

    const result = await incrementProductViewsAction(validUuid);

    expect(result).toEqual({ success: false });
    expect(rateLimit).toHaveBeenCalledWith(3, 60 * 1000);
    expect(db.update).not.toHaveBeenCalled();
  });
});
