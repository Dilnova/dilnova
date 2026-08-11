/** Shared checkout pricing rules (cart UI, server validation, invoices). */

/** @deprecated Use buildCartTaxBreakdown() from tax-engine.ts for new tax resolution. */
export const CHECKOUT_TAX_RATE = 0.0;
export const CHECKOUT_FREE_SHIPPING_THRESHOLD_CENTS = 5000; // $50.00
export const CHECKOUT_STANDARD_SHIPPING_CENTS = 500; // $5.00

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
): CheckoutTotals {
  const subtotalAmount = Math.max(0, subtotalCents);
  const taxAmount = Math.max(0, taxAmountCents);
  const shippingAmount =
    zeroShipping || subtotalAmount === 0
      ? 0
      : subtotalAmount > CHECKOUT_FREE_SHIPPING_THRESHOLD_CENTS
        ? 0
        : CHECKOUT_STANDARD_SHIPPING_CENTS;
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
