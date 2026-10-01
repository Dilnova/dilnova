import { describe, it, expect } from "vitest";
import { validateCheckoutShippingFee as validateShippingFee } from "@/features/cart/services/checkout-shipping.service";

describe("Checkout Shipping Fee Boundary & Fail-Closed Validation", () => {
  it("fails closed when rate calculation fails", () => {
    const result = validateShippingFee({
      zeroShipping: false,
      serverShippingCents: 0,
      clientShippingCents: 0,
      calculationFailed: true,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unable to calculate shipping rates");
  });

  it("fails closed when rate calculation returns 0 for a non-zero-shipping order", () => {
    const result = validateShippingFee({
      zeroShipping: false,
      serverShippingCents: 0,
      clientShippingCents: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unable to calculate shipping rates");
  });

  it("rejects attempt to claim 0 shipping when shipping is required", () => {
    const result = validateShippingFee({
      zeroShipping: false,
      serverShippingCents: 500,
      clientShippingCents: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("no shipping fee was submitted but shipping is required");
  });

  it("rejects artificially depressed shipping fees (e.g. 1 cent instead of 500 cents)", () => {
    const result = validateShippingFee({
      zeroShipping: false,
      serverShippingCents: 500,
      clientShippingCents: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("outside the allowable range");
  });

  it("rejects excessively inflated shipping fees (> 5x)", () => {
    const result = validateShippingFee({
      zeroShipping: false,
      serverShippingCents: 500,
      clientShippingCents: 3000,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("outside the allowable range");
  });

  it("accepts valid shipping within 50% to 500% of base rate (e.g. legitimate express carrier)", () => {
    const result = validateShippingFee({
      zeroShipping: false,
      serverShippingCents: 500,
      clientShippingCents: 750,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("bypasses shipping fee validation when order has zeroShipping=true (e.g. store pickup)", () => {
    const result = validateShippingFee({
      zeroShipping: true,
      serverShippingCents: 0,
      clientShippingCents: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
