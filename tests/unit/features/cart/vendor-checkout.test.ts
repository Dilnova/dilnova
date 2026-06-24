import { describe, expect, it } from 'vitest';
import {
  buildVendorCartSummaries,
  filterCartLinesByVendorOrg,
  resolveCheckoutVendorOrgId,
} from '@/features/cart/vendor-checkout';

describe('cartVendorCheckout', () => {
  const productById = new Map([
    ['p1', { id: 'p1', orgId: 'org_a', price: 1000 }],
    ['p2', { id: 'p2', orgId: 'org_a', price: 500 }],
    ['p3', { id: 'p3', orgId: 'org_b', price: 2000 }],
  ]);

  const lines = [
    { id: 'p1', quantity: 2, price: 1000 },
    { id: 'p3', quantity: 1, price: 2000 },
  ];

  it('builds per-vendor summaries with product ids', () => {
    const summaries = buildVendorCartSummaries(lines, productById, {
      org_a: 'Vendor A',
      org_b: 'Vendor B',
    });

    expect(summaries).toHaveLength(2);
    expect(summaries.find((entry) => entry.orgId === 'org_a')).toMatchObject({
      vendorName: 'Vendor A',
      subtotalCents: 2000,
      productIds: ['p1'],
      itemCount: 2,
    });
    expect(summaries.find((entry) => entry.orgId === 'org_b')).toMatchObject({
      vendorName: 'Vendor B',
      subtotalCents: 2000,
      productIds: ['p3'],
      itemCount: 1,
    });
  });

  it('filters cart lines to a selected vendor org', () => {
    const filtered = filterCartLinesByVendorOrg(lines, productById, 'org_b');
    expect(filtered).toEqual([{ id: 'p3', quantity: 1, price: 2000 }]);
  });

  it('resolves checkout vendor org id for multi-vendor carts', () => {
    const summaries = buildVendorCartSummaries(lines, productById);
    expect(resolveCheckoutVendorOrgId(summaries, undefined)).toBeNull();
    expect(resolveCheckoutVendorOrgId(summaries, 'org_b')).toBe('org_b');
    expect(resolveCheckoutVendorOrgId([summaries[0]], 'org_b')).toBe(summaries[0].orgId);
  });
});
