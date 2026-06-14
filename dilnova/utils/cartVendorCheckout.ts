export type CartCheckoutLine = { id: string; quantity: number; price: number };

export type CartProductOrgRef = { id: string; orgId: string; price: number };

export type VendorCartSummaryEntry = {
  orgId: string;
  vendorName: string;
  subtotalCents: number;
  productIds: string[];
  itemCount: number;
};

export function buildVendorCartSummaries(
  cartLines: CartCheckoutLine[],
  productById: Map<string, CartProductOrgRef>,
  vendorNamesByOrg: Record<string, string> = {}
): VendorCartSummaryEntry[] {
  const byOrg = new Map<string, { subtotal: number; productIds: string[]; itemCount: number }>();

  for (const line of cartLines) {
    const product = productById.get(line.id);
    if (!product) continue;

    const entry = byOrg.get(product.orgId) || { subtotal: 0, productIds: [], itemCount: 0 };
    entry.subtotal += product.price * line.quantity;
    if (!entry.productIds.includes(line.id)) {
      entry.productIds.push(line.id);
    }
    entry.itemCount += line.quantity;
    byOrg.set(product.orgId, entry);
  }

  return [...byOrg.entries()].map(([orgId, data]) => ({
    orgId,
    vendorName: vendorNamesByOrg[orgId] || 'Vendor',
    subtotalCents: data.subtotal,
    productIds: data.productIds,
    itemCount: data.itemCount,
  }));
}

export function filterCartLinesByVendorOrg(
  cartLines: CartCheckoutLine[],
  productById: Map<string, CartProductOrgRef>,
  checkoutVendorOrgId: string | null | undefined
): CartCheckoutLine[] {
  if (!checkoutVendorOrgId) return cartLines;
  return cartLines.filter((line) => productById.get(line.id)?.orgId === checkoutVendorOrgId);
}

export function resolveCheckoutVendorOrgId(
  vendorSummaries: VendorCartSummaryEntry[],
  requestedOrgId: string | null | undefined
): string | null {
  if (vendorSummaries.length === 0) return null;
  if (vendorSummaries.length === 1) return vendorSummaries[0].orgId;
  if (requestedOrgId && vendorSummaries.some((entry) => entry.orgId === requestedOrgId)) {
    return requestedOrgId;
  }
  return null;
}
