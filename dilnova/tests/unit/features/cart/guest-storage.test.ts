import { describe, expect, it, vi, afterEach } from 'vitest';
import { getGuestCartLineCount, GUEST_CART_STORAGE_KEY } from '@/features/cart/guest-storage';

describe('guestCartStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns zero when storage is empty', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
    });

    expect(getGuestCartLineCount()).toBe(0);
  });

  it('counts line quantities from stored cart JSON', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) =>
        key === GUEST_CART_STORAGE_KEY
          ? JSON.stringify([
              { id: 'a', quantity: 2 },
              { id: 'b', quantity: 1 },
            ])
          : null,
    });

    expect(getGuestCartLineCount()).toBe(3);
  });
});
