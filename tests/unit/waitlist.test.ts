import { describe, expect, it } from "vitest";
import {
  BUILTIN_STOCK_AVAILABILITY,
  resolveEffectiveStockAvailability,
  resolveOnlineProductPurchaseState,
} from "@/features/inventory/availability.shared";

describe("Coming Soon & Waitlist Stock Availability", () => {
  it("includes coming_soon in builtin stock availability definitions", () => {
    const comingSoonDef = BUILTIN_STOCK_AVAILABILITY.find((item) => item.id === "coming_soon");
    expect(comingSoonDef).toBeDefined();
    expect(comingSoonDef?.allowsPurchase).toBe(false);
    expect(comingSoonDef?.badgeTone).toBe("blue");
  });

  it("resolves coming_soon stock availability properly regardless of quantity", () => {
    const resolved = resolveEffectiveStockAvailability(
      BUILTIN_STOCK_AVAILABILITY,
      "coming_soon",
      0,
    );
    expect(resolved?.id).toBe("coming_soon");
    expect(resolved?.allowsPurchase).toBe(false);
  });

  it("blocks online purchase checkout when status is coming_soon", () => {
    const state = resolveOnlineProductPurchaseState("product", BUILTIN_STOCK_AVAILABILITY, {
      stockAvailability: "coming_soon",
      quantity: 0,
    });
    expect(state.canPurchase).toBe(false);
    expect(state.availabilityDef?.id).toBe("coming_soon");
  });
});
