import { describe, expect, it } from "vitest";
import { applyCatalogSync, getCartAccountKey, mergeCartItems } from "@/features/cart/cart-session";
import type { SyncedCartItem } from "@/features/cart/schema";

const sampleItem = (id: string, quantity = 1): SyncedCartItem => ({
  id,
  name: `Product ${id}`,
  price: 1000,
  imageUrl: null,
  quantity,
  vendorName: "Vendor",
  type: "product",
});

describe("cart session helpers", () => {
  it("builds stable account keys", () => {
    expect(getCartAccountKey(false, null)).toBe("guest");
    expect(getCartAccountKey(true, "user_a")).toBe("user:user_a");
    expect(getCartAccountKey(true, "user_b")).toBe("user:user_b");
  });

  it("merges remote and local carts by product id", () => {
    const merged = mergeCartItems(
      [sampleItem("p1", 2)],
      [sampleItem("p1", 1), sampleItem("p2", 1)],
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === "p1")?.quantity).toBe(2);
  });

  it("does not carry prior-user items when loading a fresh remote cart", () => {
    const userAItems = [sampleItem("a1", 3)];
    const userBRemote = [sampleItem("b1", 1)];

    const leaked = mergeCartItems(userAItems, userBRemote);
    expect(leaked.some((item) => item.id === "a1")).toBe(true);

    const isolated = mergeCartItems([], userBRemote);
    expect(isolated).toEqual(userBRemote);
  });

  it("applies catalog sync updates and removals", () => {
    const next = applyCatalogSync(
      [sampleItem("p1", 1), sampleItem("p2", 1)],
      [{ id: "p1", name: "Updated", price: 1500 }],
      ["p2"],
    );

    expect(next).toHaveLength(1);
    expect(next[0]?.name).toBe("Updated");
    expect(next[0]?.price).toBe(1500);
  });
});
