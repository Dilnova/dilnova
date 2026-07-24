import { describe, expect, it, vi, afterEach } from "vitest";
import { getGuestCartLineCount, GUEST_CART_STORAGE_KEY } from "@/features/cart/guest-storage";

describe("guestCartStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns zero when storage is empty", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
    });

    expect(getGuestCartLineCount()).toBe(0);
  });

  it("counts line quantities from stored cart JSON", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === GUEST_CART_STORAGE_KEY
          ? JSON.stringify([
              {
                id: "123e4567-e89b-12d3-a456-426614174000",
                name: "A",
                price: 100,
                imageUrl: null,
                quantity: 2,
                vendorName: "Vendor",
                type: "product",
              },
              {
                id: "123e4567-e89b-12d3-a456-426614174001",
                name: "B",
                price: 200,
                imageUrl: null,
                quantity: 1,
                vendorName: "Vendor",
                type: "product",
              },
            ])
          : null,
    });

    expect(getGuestCartLineCount()).toBe(3);
  });
});
