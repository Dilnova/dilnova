import { describe, it, expect } from 'vitest';
import {
  calculateCheckoutTotals,
  getOrderDisplayTotals,
  CHECKOUT_TAX_RATE,
  CHECKOUT_STANDARD_SHIPPING_CENTS,
} from '@/features/billing/checkout-totals';

describe('Checkout Totals (Billing)', () => {
  describe('calculateCheckoutTotals()', () => {
    it('calculates totals correctly below the free shipping threshold', () => {
      // $20.00 subtotal (below $50.00 threshold)
      const subtotalCents = 2000;
      const result = calculateCheckoutTotals(subtotalCents);

      expect(result.subtotalAmount).toBe(2000);
      expect(result.taxAmount).toBe(Math.round(2000 * CHECKOUT_TAX_RATE)); // 2000 * 0.08 = 160
      expect(result.shippingAmount).toBe(CHECKOUT_STANDARD_SHIPPING_CENTS); // 500
      expect(result.grandTotal).toBe(2000 + 160 + 500); // 2660
    });

    it('calculates totals correctly above the free shipping threshold', () => {
      // $60.00 subtotal (above $50.00 threshold)
      const subtotalCents = 6000;
      const result = calculateCheckoutTotals(subtotalCents);

      expect(result.subtotalAmount).toBe(6000);
      expect(result.taxAmount).toBe(Math.round(6000 * CHECKOUT_TAX_RATE)); // 6000 * 0.08 = 480
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(6000 + 480 + 0); // 6480
    });

    it('forces zero shipping if zeroShipping flag is true', () => {
      // $20.00 subtotal (would normally have shipping)
      const subtotalCents = 2000;
      const result = calculateCheckoutTotals(subtotalCents, true);

      expect(result.subtotalAmount).toBe(2000);
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(2000 + 160); // 2160
    });

    it('handles zero subtotal correctly', () => {
      const result = calculateCheckoutTotals(0);
      expect(result.subtotalAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(CHECKOUT_STANDARD_SHIPPING_CENTS);
      expect(result.grandTotal).toBe(500);
    });

    it('handles negative subtotal by clamping to zero', () => {
      const result = calculateCheckoutTotals(-500);
      expect(result.subtotalAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(CHECKOUT_STANDARD_SHIPPING_CENTS);
      expect(result.grandTotal).toBe(500);
    });
  });

  describe('getOrderDisplayTotals()', () => {
    it('returns exact breakdown when full breakdown is provided', () => {
      const order = {
        totalAmount: 3000,
        subtotalAmount: 2000,
        taxAmount: 200,
        shippingAmount: 800,
      };

      const result = getOrderDisplayTotals(order);
      expect(result.subtotalAmount).toBe(2000);
      expect(result.taxAmount).toBe(200);
      expect(result.shippingAmount).toBe(800);
      expect(result.grandTotal).toBe(3000);
    });

    it('infers tax and zero shipping for legacy orders missing breakdown', () => {
      // Only totalAmount provided
      const order = {
        totalAmount: 1000,
      };

      const result = getOrderDisplayTotals(order);
      expect(result.subtotalAmount).toBe(1000);
      expect(result.taxAmount).toBe(Math.round(1000 * CHECKOUT_TAX_RATE)); // 80
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(1000 + 80);
    });
  });
});
