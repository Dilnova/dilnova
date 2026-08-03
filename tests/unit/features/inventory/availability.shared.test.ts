import { describe, expect, it } from "vitest";
import {
  BUILTIN_STOCK_AVAILABILITY,
  resolveOnlineProductPurchaseState,
} from "@/features/inventory/availability.shared";

describe("resolveOnlineProductPurchaseState", () => {
  it("allows services without inventory", () => {
    const result = resolveOnlineProductPurchaseState("service", BUILTIN_STOCK_AVAILABILITY, null);
    expect(result.canPurchase).toBe(true);
    expect(result.availabilityDef).toBeNull();
  });

  it("blocks products with no inventory record", () => {
    const result = resolveOnlineProductPurchaseState(
      "product",
      BUILTIN_STOCK_AVAILABILITY,
      undefined,
    );
    expect(result.canPurchase).toBe(false);
    expect(result.availabilityDef?.id).toBe("out_of_stock");
  });

  it("resolves in_stock for products with quantity > 2", () => {
    const result = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "in_stock",
      quantity: 5,
    });
    expect(result.canPurchase).toBe(true);
    expect(result.availabilityDef?.id).toBe("in_stock");
  });

  it("auto-badges 1 or 2 units as limited_stock", () => {
    const resultOne = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "in_stock",
      quantity: 1,
    });
    expect(resultOne.canPurchase).toBe(true);
    expect(resultOne.availabilityDef?.id).toBe("limited_stock");

    const resultTwo = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "in_stock",
      quantity: 2,
    });
    expect(resultTwo.canPurchase).toBe(true);
    expect(resultTwo.availabilityDef?.id).toBe("limited_stock");
  });

  it("preserves vendor-selected limited_stock for any quantity >= 1", () => {
    const result = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "limited_stock",
      quantity: 10,
    });
    expect(result.canPurchase).toBe(true);
    expect(result.availabilityDef?.id).toBe("limited_stock");
  });

  it("blocks products with zero quantity marked in stock", () => {
    const result = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "in_stock",
      quantity: 0,
    });
    expect(result.canPurchase).toBe(false);
    expect(result.availabilityDef?.id).toBe("out_of_stock");
  });
});
