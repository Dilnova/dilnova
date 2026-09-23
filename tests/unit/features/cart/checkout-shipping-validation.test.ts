import { describe, it, expect } from "vitest";

describe("Checkout Shipping Fee Boundary & Fail-Closed Validation", () => {
  function validateShippingFee(opts: {
    zeroShipping: boolean;
    serverShippingCents: number;
    clientShippingCents: number;
    calculationFailed?: boolean;
  }): { valid: boolean; error?: string } {
    if (opts.zeroShipping) {
      return { valid: true };
    }

    if (opts.calculationFailed || opts.serverShippingCents <= 0) {
      return {
        valid: false,
        error:
          "Unable to calculate shipping rates for the delivery address. Please verify your address or select another fulfillment option.",
      };
    }

    if (opts.clientShippingCents === 0) {
      return {
        valid: false,
        error:
          "Checkout total mismatch: no shipping fee was submitted but shipping is required. Please refresh your cart and try again.",
      };
    }

    const minAcceptableShipping = Math.floor(opts.serverShippingCents * 0.5);
    const maxAcceptableShipping = Math.ceil(opts.serverShippingCents * 5);

    if (
      opts.clientShippingCents < minAcceptableShipping ||
      opts.clientShippingCents > maxAcceptableShipping
    ) {
      return {
        valid: false,
        error:
          "Checkout total mismatch: submitted shipping fee is outside the allowable range for this delivery. Please refresh your cart and select a shipping method.",
      };
    }

    return { valid: true };
  }

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
