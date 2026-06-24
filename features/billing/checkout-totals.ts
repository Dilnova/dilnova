/** Shared checkout pricing rules (cart UI, server validation, invoices). */

export const CHECKOUT_TAX_RATE = 0.08;
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
  zeroShipping = false
): CheckoutTotals {
  const subtotalAmount = Math.max(0, subtotalCents);
  const taxAmount = Math.round(subtotalAmount * CHECKOUT_TAX_RATE);
  const shippingAmount = zeroShipping
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
    order.subtotalAmount != null &&
    order.taxAmount != null &&
    order.shippingAmount != null;

  if (hasBreakdown) {
    return {
      subtotalAmount: order.subtotalAmount!,
      taxAmount: order.taxAmount!,
      shippingAmount: order.shippingAmount!,
      grandTotal: order.totalAmount,
    };
  }

  const subtotalAmount = order.totalAmount;
  const taxAmount = Math.round(subtotalAmount * CHECKOUT_TAX_RATE);
  return {
    subtotalAmount,
    taxAmount,
    shippingAmount: 0,
    grandTotal: subtotalAmount + taxAmount,
  };
}
