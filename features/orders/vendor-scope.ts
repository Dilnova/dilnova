export const MULTI_VENDOR_ORDER_CHECKOUT_ERROR =
  'Your cart includes items from multiple vendors. Select one vendor to checkout, then place separate orders for the rest.';

export const MULTI_VENDOR_VENDOR_ACTION_ERROR =
  'This order includes items from multiple vendors. Vendor payment actions are disabled for shared multi-vendor orders.';

export function orderSpansMultipleVendors(vendorOrgIds: readonly string[]): boolean {
  return new Set(vendorOrgIds).size > 1;
}
