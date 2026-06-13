export const MULTI_VENDOR_ORDER_CHECKOUT_ERROR =
  'Bank transfer and cash on delivery checkout requires all items from a single vendor. Remove items from other vendors or place separate orders.';

export const MULTI_VENDOR_VENDOR_ACTION_ERROR =
  'This order includes items from multiple vendors. Vendor payment actions are disabled for shared multi-vendor orders.';

export function orderSpansMultipleVendors(vendorOrgIds: readonly string[]): boolean {
  return new Set(vendorOrgIds).size > 1;
}
