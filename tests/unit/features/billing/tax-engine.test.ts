import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

import {
  calculateLineTax,
  ZERO_TAX_CLASS,
  sanitizeRatePercent,
  normalizeTaxClass,
  type ResolvedTaxClass,
} from "@/features/billing/tax-engine";

describe("Tax Engine (Billing)", () => {
  describe("sanitizeRatePercent() and normalizeTaxClass()", () => {
    it("safely normalizes null, undefined, and NaN ratePercent to 0", () => {
      expect(sanitizeRatePercent(null)).toBe(0);
      expect(sanitizeRatePercent(undefined)).toBe(0);
      expect(sanitizeRatePercent(NaN)).toBe(0);
      expect(sanitizeRatePercent(-5)).toBe(0);
      expect(sanitizeRatePercent(Infinity)).toBe(0);
      expect(sanitizeRatePercent(18)).toBe(18);
      expect(sanitizeRatePercent(2.5)).toBe(2.5);
    });

    it("normalizes null/undefined tax classes to ZERO_TAX_CLASS fallback", () => {
      expect(normalizeTaxClass(null)).toEqual(ZERO_TAX_CLASS);
      expect(normalizeTaxClass(undefined)).toEqual(ZERO_TAX_CLASS);
      expect(
        normalizeTaxClass({
          id: "custom-id",
          ratePercent: null as unknown as number,
        }),
      ).toEqual({
        id: "custom-id",
        code: "ZERO",
        name: "No Tax",
        ratePercent: 0,
      });
    });
  });

  describe("calculateLineTax()", () => {
    it("calculates 8% tax accurately", () => {
      const taxClass: ResolvedTaxClass = {
        id: "tax-1",
        code: "STANDARD",
        name: "Standard Rate",
        ratePercent: 8,
      };

      const result = calculateLineTax(1000, 2, taxClass); // $10.00 x 2 = $20.00 (2000 cents)

      expect(result.lineSubtotalCents).toBe(2000);
      expect(result.taxAmountCents).toBe(160); // 2000 * 0.08 = 160
      expect(result.taxRatePercent).toBe(8);
      expect(result.taxClassCode).toBe("STANDARD");
    });

    it("handles ZERO tax class code (0% tax)", () => {
      const result = calculateLineTax(5000, 1, ZERO_TAX_CLASS);

      expect(result.lineSubtotalCents).toBe(5000);
      expect(result.taxAmountCents).toBe(0);
      expect(result.taxRatePercent).toBe(0);
      expect(result.taxClassCode).toBe("ZERO");
    });

    it("rounds fractional cent tax correctly", () => {
      const taxClass: ResolvedTaxClass = {
        id: "tax-reduced",
        code: "REDUCED",
        name: "Reduced Rate",
        ratePercent: 5.5,
      };

      // 1000 cents * 5.5% = 55 cents
      const result1 = calculateLineTax(1000, 1, taxClass);
      expect(result1.taxAmountCents).toBe(55);

      // 1099 cents * 5.5% = 60.445 -> rounds to 60 cents
      const result2 = calculateLineTax(1099, 1, taxClass);
      expect(result2.taxAmountCents).toBe(60);
    });

    it("handles negative subtotal by clamping to 0", () => {
      const taxClass: ResolvedTaxClass = {
        id: "tax-1",
        code: "VAT_STD",
        name: "Sri Lanka Standard VAT",
        ratePercent: 18,
      };

      const result = calculateLineTax(-100, 1, taxClass);

      expect(result.lineSubtotalCents).toBe(0);
      expect(result.taxAmountCents).toBe(0);
    });

    it("calculates Sri Lanka 18% Standard VAT accurately", () => {
      const taxClass: ResolvedTaxClass = {
        id: "vat-std-id",
        code: "VAT_STD",
        name: "Sri Lanka Standard VAT (18%)",
        ratePercent: 18,
      };

      const result = calculateLineTax(3000, 1, taxClass); // $30.00 x 1 = $30.00 (3000 cents)

      expect(result.lineSubtotalCents).toBe(3000);
      expect(result.taxAmountCents).toBe(540); // 3000 * 0.18 = 540 cents ($5.40)
      expect(result.taxRatePercent).toBe(18);
      expect(result.taxClassCode).toBe("VAT_STD");
    });

    it("calculates Sri Lanka 2.5% SSCL accurately", () => {
      const taxClass: ResolvedTaxClass = {
        id: "sscl-id",
        code: "SSCL",
        name: "Social Security Levy - SSCL (2.5%)",
        ratePercent: 2.5,
      };

      const result = calculateLineTax(10000, 1, taxClass); // $100.00 (10,000 cents)

      expect(result.lineSubtotalCents).toBe(10000);
      expect(result.taxAmountCents).toBe(250); // 10000 * 0.025 = 250 cents ($2.50)
      expect(result.taxRatePercent).toBe(2.5);
      expect(result.taxClassCode).toBe("SSCL");
    });

    it("never produces NaN on invalid/null/undefined or corrupted tax class inputs", () => {
      // Corrupted tax class with null rate
      const corruptedTaxClass = {
        id: "corrupted",
        code: "CORRUPTED",
        name: "Corrupted Tax",
        ratePercent: null as unknown as number,
      };

      const result1 = calculateLineTax(1000, 2, corruptedTaxClass);
      expect(Number.isNaN(result1.taxAmountCents)).toBe(false);
      expect(Number.isNaN(result1.lineSubtotalCents)).toBe(false);
      expect(result1.taxAmountCents).toBe(0);
      expect(result1.lineSubtotalCents).toBe(2000);

      // Null tax class
      const result2 = calculateLineTax(1000, 2, null);
      expect(Number.isNaN(result2.taxAmountCents)).toBe(false);
      expect(result2.taxAmountCents).toBe(0);

      // NaN unit price or quantity
      const result3 = calculateLineTax(NaN, NaN, ZERO_TAX_CLASS);
      expect(Number.isNaN(result3.lineSubtotalCents)).toBe(false);
      expect(Number.isNaN(result3.taxAmountCents)).toBe(false);
      expect(result3.lineSubtotalCents).toBe(0);
      expect(result3.taxAmountCents).toBe(0);
    });
  });
});
