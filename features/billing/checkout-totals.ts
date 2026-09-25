/** Shared checkout pricing rules (cart UI, server validation, invoices). */

export interface CheckoutTotals {
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
}

export function calculateCheckoutTotals(
  subtotalCents: number,
  zeroShipping = false,
  taxAmountCents = 0,
  shippingOverrideCents?: number | null,
): CheckoutTotals {
  const safeSubtotal = Number.isFinite(subtotalCents) ? Math.max(0, Math.round(subtotalCents)) : 0;
  const safeTax = Number.isFinite(taxAmountCents) ? Math.max(0, Math.round(taxAmountCents)) : 0;
  const safeShippingOverride =
    shippingOverrideCents != null && Number.isFinite(shippingOverrideCents)
      ? Math.max(0, Math.round(shippingOverrideCents))
      : 0;

  const shippingAmount = zeroShipping || safeSubtotal === 0 ? 0 : safeShippingOverride;
  const grandTotal = safeSubtotal + safeTax + shippingAmount;

  return { subtotalAmount: safeSubtotal, taxAmount: safeTax, shippingAmount, grandTotal };
}

export interface ItemTotalInput {
  qty: number;
  price?: number | null;
  priceCents?: number | null;
}

/**
 * Calculates item line total in cents.
 * Prioritizes priceCents if provided, otherwise calculates from fractional currency units.
 * Guaranteed to return a non-negative integer, protecting against NaN, null, or undefined.
 */
export function calculateItemTotalCents(item: ItemTotalInput): number {
  const safeQty = Number.isFinite(item.qty) ? Math.max(0, item.qty) : 0;
  if (item.priceCents != null && Number.isFinite(item.priceCents)) {
    return Math.round(Math.max(0, item.priceCents) * safeQty);
  }
  const safePrice = item.price != null && Number.isFinite(item.price) ? Math.max(0, item.price) : 0;
  return Math.round(safePrice * safeQty * 100);
}

export interface OrderAmountFields {
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
}

/** Resolve display amounts for legacy orders (subtotal-only) and new breakdown rows. */
export function getOrderDisplayTotals(order: OrderAmountFields): CheckoutTotals {
  const safeGrandTotal = Number.isFinite(order.totalAmount) ? Math.max(0, order.totalAmount) : 0;
  const hasBreakdown =
    order.subtotalAmount != null &&
    Number.isFinite(order.subtotalAmount) &&
    order.taxAmount != null &&
    Number.isFinite(order.taxAmount) &&
    order.shippingAmount != null &&
    Number.isFinite(order.shippingAmount);

  if (hasBreakdown) {
    return {
      subtotalAmount: Math.max(0, order.subtotalAmount!),
      taxAmount: Math.max(0, order.taxAmount!),
      shippingAmount: Math.max(0, order.shippingAmount!),
      grandTotal: safeGrandTotal,
    };
  }

  const subtotalAmount =
    order.subtotalAmount != null && Number.isFinite(order.subtotalAmount)
      ? Math.max(0, order.subtotalAmount)
      : safeGrandTotal;
  const taxAmount =
    order.taxAmount != null && Number.isFinite(order.taxAmount) ? Math.max(0, order.taxAmount) : 0;
  const shippingAmount =
    order.shippingAmount != null && Number.isFinite(order.shippingAmount)
      ? Math.max(0, order.shippingAmount)
      : 0;
  return {
    subtotalAmount,
    taxAmount,
    shippingAmount,
    grandTotal: safeGrandTotal,
  };
}
