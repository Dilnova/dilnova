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

export type VendorCartGroupItem = {
  id: string;
  price: number;
  quantity: number;
  vendorName: string;
};

export type VendorCartGroupView<T extends VendorCartGroupItem = VendorCartGroupItem> = {
  orgId: string;
  vendorName: string;
  subtotalCents: number;
  itemCount: number;
  items: T[];
};

/** Build display groups from the full cart. Checkout ticks must not filter this list. */
export function groupCartItemsByVendor<T extends VendorCartGroupItem>(
  cartItems: T[],
  vendorSummaries: VendorCartSummaryEntry[]
): VendorCartGroupView<T>[] {
  if (vendorSummaries.length > 0) {
    return vendorSummaries
      .map((summary) => {
        const items = cartItems.filter((item) => summary.productIds.includes(item.id));
        return {
          orgId: summary.orgId,
          vendorName: summary.vendorName,
          subtotalCents: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }

  const byVendorName = new Map<string, VendorCartGroupView<T>>();
  for (const item of cartItems) {
    const existing = byVendorName.get(item.vendorName);
    if (existing) {
      existing.items.push(item);
      existing.subtotalCents += item.price * item.quantity;
      existing.itemCount += item.quantity;
    } else {
      byVendorName.set(item.vendorName, {
        orgId: item.vendorName,
        vendorName: item.vendorName,
        subtotalCents: item.price * item.quantity,
        itemCount: item.quantity,
        items: [item],
      });
    }
  }

  return [...byVendorName.values()];
}

/** Keep checkout ticks in sync when cart lines are added/removed — never re-tick user unticks. */
export function syncSelectedProductIds(params: {
  previousSelection: readonly string[];
  previousCartIds: readonly string[];
  currentCartIds: readonly string[];
}): string[] {
  const { previousSelection, previousCartIds, currentCartIds } = params;
  const currentIdSet = new Set(currentCartIds);
  const previousCartIdSet = new Set(previousCartIds);
  const pruned = previousSelection.filter((id) => currentIdSet.has(id));
  const newlyAddedIds = currentCartIds.filter((id) => !previousCartIdSet.has(id));

  if (pruned.length === 0 && currentCartIds.length > 0) {
    return [...currentCartIds];
  }

  if (newlyAddedIds.length === 0) {
    return pruned;
  }

  const prunedSet = new Set(pruned);
  return [...pruned, ...newlyAddedIds.filter((id) => !prunedSet.has(id))];
}

export function resolveCheckoutCartItems<T extends { id: string }>(
  cartItems: T[],
  selectedProductIds: readonly string[],
  vendorProductIds?: readonly string[] | null
): T[] {
  const selectedSet = new Set(selectedProductIds);
  const vendorSet = vendorProductIds ? new Set(vendorProductIds) : null;

  return cartItems.filter((item) => {
    if (!selectedSet.has(item.id)) return false;
    if (vendorSet && !vendorSet.has(item.id)) return false;
    return true;
  });
}

export function toggleProductInSelection(
  selectedProductIds: readonly string[],
  productId: string
): string[] {
  return selectedProductIds.includes(productId)
    ? selectedProductIds.filter((id) => id !== productId)
    : [...selectedProductIds, productId];
}

export function toggleAllProductsInSelection(
  selectedProductIds: readonly string[],
  productIds: readonly string[],
  checked: boolean
): string[] {
  if (checked) {
    return [...new Set([...selectedProductIds, ...productIds])];
  }
  const removeSet = new Set(productIds);
  return selectedProductIds.filter((id) => !removeSet.has(id));
}
