import { describe, it, expect } from "vitest";
import { calculateCheckoutTotals, getOrderDisplayTotals } from "@/features/billing/checkout-totals";

describe("Checkout Totals (Billing)", () => {
  describe("calculateCheckoutTotals()", () => {
    it("calculates totals correctly with calculated shipping override", () => {
      const subtotalCents = 2000;
      const taxCents = 160;
      const shippingCents = 21500; // SL Post domestic rate (LKR 215.00)
      const result = calculateCheckoutTotals(subtotalCents, false, taxCents, shippingCents);

      expect(result.subtotalAmount).toBe(2000);
      expect(result.taxAmount).toBe(160);
      expect(result.shippingAmount).toBe(21500);
      expect(result.grandTotal).toBe(2000 + 160 + 21500);
    });

    it("forces zero shipping if zeroShipping flag is true", () => {
      const subtotalCents = 2000;
      const taxCents = 160;
      const result = calculateCheckoutTotals(subtotalCents, true, taxCents, 21500);

      expect(result.subtotalAmount).toBe(2000);
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(2000 + 160);
    });

    it("handles zero subtotal correctly", () => {
      const result = calculateCheckoutTotals(0, false, 0);
      expect(result.subtotalAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(0);
    });

    it("handles negative subtotal by clamping to zero", () => {
      const result = calculateCheckoutTotals(-500, false, 0);
      expect(result.subtotalAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(0);
    });
  });

  describe("getOrderDisplayTotals()", () => {
    it("returns exact breakdown when full breakdown is provided", () => {
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

    it("handles legacy orders missing breakdown gracefully", () => {
      const order = {
        totalAmount: 1000,
      };

      const result = getOrderDisplayTotals(order);
      expect(result.subtotalAmount).toBe(1000);
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(0);
      expect(result.grandTotal).toBe(1000);
    });
  });
});
