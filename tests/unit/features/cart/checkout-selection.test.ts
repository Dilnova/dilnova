import { describe, expect, it } from "vitest";
import {
  groupCartItemsByVendor,
  resolveCheckoutCartItems,
  syncSelectedProductIds,
  toggleAllProductsInSelection,
  toggleProductInSelection,
} from "@/features/cart/vendor-checkout";

describe("cart checkout selection", () => {
  const cartItems = [
    { id: "p1", price: 1000, quantity: 1, vendorName: "Vendor A" },
    { id: "p2", price: 500, quantity: 2, vendorName: "Vendor A" },
    { id: "p3", price: 2000, quantity: 1, vendorName: "Vendor B" },
  ];

  const summaries = [
    {
      orgId: "org_a",
      vendorName: "Vendor A",
      subtotalCents: 2000,
      productIds: ["p1", "p2"],
      itemCount: 3,
    },
    {
      orgId: "org_b",
      vendorName: "Vendor B",
      subtotalCents: 2000,
      productIds: ["p3"],
      itemCount: 1,
    },
  ];

  it("groups the full cart even when checkout selection is partial", () => {
    const groups = groupCartItemsByVendor(cartItems, summaries);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(groups[1].items.map((item) => item.id)).toEqual(["p3"]);
  });

  it("does not re-select products the user unticked", () => {
    const next = syncSelectedProductIds({
      previousSelection: ["p1"],
      previousCartIds: ["p1", "p2", "p3"],
      currentCartIds: ["p1", "p2", "p3"],
    });
    expect(next).toEqual(["p1"]);
  });

  it("auto-selects newly added cart lines", () => {
    const next = syncSelectedProductIds({
      previousSelection: ["p1"],
      previousCartIds: ["p1"],
      currentCartIds: ["p1", "p2"],
    });
    expect(next).toEqual(["p1", "p2"]);
  });

  it("resolves checkout lines from ticks without mutating cart inventory", () => {
    const checkoutItems = resolveCheckoutCartItems(cartItems, ["p1"], ["p1", "p2"]);
    expect(checkoutItems.map((item) => item.id)).toEqual(["p1"]);
  });

  it("toggles individual and bulk product selection", () => {
    expect(toggleProductInSelection(["p1", "p2"], "p2")).toEqual(["p1"]);
    expect(toggleProductInSelection(["p1"], "p2")).toEqual(["p1", "p2"]);
    expect(toggleAllProductsInSelection(["p1"], ["p1", "p2"], true)).toEqual(["p1", "p2"]);
    expect(toggleAllProductsInSelection(["p1", "p2"], ["p1", "p2"], false)).toEqual([]);
  });
});
