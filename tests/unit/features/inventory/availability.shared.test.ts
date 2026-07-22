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

  it("allows in-stock products with quantity", () => {
    const result = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "in_stock",
      quantity: 5,
    });
    expect(result.canPurchase).toBe(true);
    expect(result.availabilityDef?.id).toBe("in_stock");
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
