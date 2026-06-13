import { describe, expect, it } from 'vitest';
import {
  MULTI_VENDOR_ORDER_CHECKOUT_ERROR,
  MULTI_VENDOR_VENDOR_ACTION_ERROR,
  orderSpansMultipleVendors,
} from './orderVendorScope';

describe('orderVendorScope', () => {
  it('detects multi-vendor orders', () => {
    expect(orderSpansMultipleVendors(['org_a'])).toBe(false);
    expect(orderSpansMultipleVendors(['org_a', 'org_a'])).toBe(false);
    expect(orderSpansMultipleVendors(['org_a', 'org_b'])).toBe(true);
  });

  it('exports stable error messages', () => {
    expect(MULTI_VENDOR_ORDER_CHECKOUT_ERROR).toContain('single vendor');
    expect(MULTI_VENDOR_VENDOR_ACTION_ERROR).toContain('multiple vendors');
  });
});
