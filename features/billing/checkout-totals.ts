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
  const subtotalAmount = Math.max(0, subtotalCents);
  const taxAmount = Math.max(0, taxAmountCents);
  const shippingAmount =
    zeroShipping || subtotalAmount === 0 ? 0 : Math.max(0, shippingOverrideCents ?? 0);
  const grandTotal = subtotalAmount + taxAmount + shippingAmount;

  return { subtotalAmount, taxAmount, shippingAmount, grandTotal };
}

export interface OrderAmountFields {
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
}

/** Resolve display amounts for legacy orders (subtotal-only) and new breakdown rows. */
export function getOrderDisplayTotals(order: OrderAmountFields): CheckoutTotals {
  const hasBreakdown =
    order.subtotalAmount != null && order.taxAmount != null && order.shippingAmount != null;

  if (hasBreakdown) {
    return {
      subtotalAmount: order.subtotalAmount!,
      taxAmount: order.taxAmount!,
      shippingAmount: order.shippingAmount!,
      grandTotal: order.totalAmount,
    };
  }

  const subtotalAmount = order.subtotalAmount ?? order.totalAmount;
  const taxAmount = order.taxAmount ?? 0;
  const shippingAmount = order.shippingAmount ?? 0;
  return {
    subtotalAmount,
    taxAmount,
    shippingAmount,
    grandTotal: order.totalAmount,
  };
}
