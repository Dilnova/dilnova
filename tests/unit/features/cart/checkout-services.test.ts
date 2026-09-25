import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateAndValidateCheckoutShipping } from "@/features/cart/services/checkout-shipping.service";
import { getCustomerDeliveryDetailsService } from "@/features/cart/services/customer-delivery.service";
import {
  getCustomerDeliveryDetailsAction,
  sendCartSummaryEmailAction,
  syncCartPricesAction,
  getCartCheckoutOptionsAction,
  simulatedCheckoutAction,
} from "@/features/cart/checkout.actions";
import type { VerifiedCheckoutItem } from "@/features/cart/services/checkout.types";

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
  currentUser: vi.fn(),
}));

describe("Decomposed Checkout Services Architecture (§1 Quality)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkout.actions.ts thin action wrappers", () => {
    it("exports all expected action handlers with callable wrappers", () => {
      expect(getCustomerDeliveryDetailsAction).toBeDefined();
      expect(sendCartSummaryEmailAction).toBeDefined();
      expect(syncCartPricesAction).toBeDefined();
      expect(getCartCheckoutOptionsAction).toBeDefined();
      expect(simulatedCheckoutAction).toBeDefined();
    });
  });

  describe("customer-delivery.service.ts", () => {
    it("returns null when user has no private metadata", async () => {
      const { clerkClient } = await import("@clerk/nextjs/server");
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: "user_test",
            privateMetadata: null,
          }),
        },
      } as unknown as Awaited<ReturnType<typeof clerkClient>>);

      const result = await getCustomerDeliveryDetailsService("user_test");
      expect(result).toBeNull();
    });

    it("extracts delivery details from Clerk private metadata", async () => {
      const { clerkClient } = await import("@clerk/nextjs/server");
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: "user_test",
            privateMetadata: {
              shippingAddress: "123 Main St",
              shippingCity: "Colombo",
              shippingCountry: "LK",
              shippingPhone: "+94771234567",
            },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof clerkClient>>);

      const result = await getCustomerDeliveryDetailsService("user_test");
      expect(result).toEqual({
        shippingAddress: "123 Main St",
        shippingAddressLine2: "",
        shippingCity: "Colombo",
        shippingState: "",
        shippingPostalCode: "",
        shippingCountry: "LK",
        shippingPhone: "+94771234567",
        shippingPhone2: "",
      });
    });

    it("gracefully catches errors and returns null", async () => {
      const { clerkClient } = await import("@clerk/nextjs/server");
      vi.mocked(clerkClient).mockRejectedValue(new Error("Clerk API unavailable"));

      const result = await getCustomerDeliveryDetailsService("user_test");
      expect(result).toBeNull();
    });
  });

  describe("checkout-shipping.service.ts calculateAndValidateCheckoutShipping", () => {
    const dummyItem: VerifiedCheckoutItem = {
      id: "prod-1",
      name: "Product 1",
      price: 2000,
      quantity: 1,
      vendorOrgId: "org-1",
      type: "product",
      vendorBaseCurrency: "LKR",
    };

    it("succeeds with 0 shipping for zeroShipping=true orders", async () => {
      const result = await calculateAndValidateCheckoutShipping({
        zeroShipping: true,
        verifiedItems: [dummyItem],
        branchesByOrg: new Map(),
        destination: {
          name: "John Doe",
          street: null,
          city: null,
        },
        clientGrandTotal: 2000,
        serverSubtotal: 2000,
        totalTaxCents: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.serverShippingCents).toBe(0);
        expect(result.clientShippingCents).toBe(0);
      }
    });

    it("fails closed when client submits 0 shipping for a delivery order", async () => {
      const result = await calculateAndValidateCheckoutShipping({
        zeroShipping: false,
        verifiedItems: [dummyItem],
        branchesByOrg: new Map(),
        destination: {
          name: "John Doe",
          street: "123 Main St",
          city: "Colombo",
        },
        clientGrandTotal: 2000,
        serverSubtotal: 2000,
        totalTaxCents: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no shipping fee was submitted but shipping is required");
      }
    });
  });
});
