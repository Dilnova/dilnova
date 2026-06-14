import { describe, expect, it } from 'vitest';
import {
  BUILTIN_CHECKOUT_OPTIONS,
  buildCheckoutOptionsCatalogPayload,
  parseCheckoutOptionsCatalog,
} from '@/features/organization/checkout-options.shared';

describe('checkoutOptionsShared', () => {
  it('does not include pay_online in built-in checkout options', () => {
    expect(BUILTIN_CHECKOUT_OPTIONS.some((option) => option.id === 'pay_online')).toBe(false);
  });

  it('filters pay_online from persisted catalog JSON', () => {
    const legacyCatalog = JSON.stringify([
      ...BUILTIN_CHECKOUT_OPTIONS,
      {
        id: 'pay_online',
        label: 'Pay Online',
        type: 'payment',
        platformEnabled: true,
        isBuiltIn: true,
      },
    ]);

    const parsed = parseCheckoutOptionsCatalog(legacyCatalog);
    expect(parsed.some((option) => option.id === 'pay_online')).toBe(false);
  });

  it('strips pay_online when saving catalog payload', () => {
    const payload = buildCheckoutOptionsCatalogPayload([
      ...BUILTIN_CHECKOUT_OPTIONS,
      {
        id: 'pay_online',
        label: 'Pay Online',
        type: 'payment',
        platformEnabled: true,
      },
    ]);

    expect(payload.some((option) => option.id === 'pay_online')).toBe(false);
  });
});
