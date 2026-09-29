import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  simulatedCheckoutAction,
  sendCartSummaryEmailAction,
  syncCartPricesAction,
  getCartCheckoutOptionsAction,
} from "@/features/cart/checkout.actions";

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/features/cart/services/checkout-pipeline.service", () => ({
  executeSimulatedCheckout: vi.fn(),
}));

vi.mock("@/features/cart/services/cart-email.service", () => ({
  sendCartSummaryEmailService: vi.fn(),
}));

vi.mock("@/features/cart/services/cart-sync.service", () => ({
  syncCartPricesService: vi.fn(),
}));

vi.mock("@/features/cart/services/checkout-options.service", () => ({
  getCheckoutOptionsService: vi.fn(),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user_cart_123",
    orgId: null,
    orgRole: null,
    sessionClaims: {},
  }),
  currentUser: vi.fn().mockResolvedValue({
    id: "user_cart_123",
    fullName: "Cart User",
    emailAddresses: [{ emailAddress: "cartuser@example.com" }],
  }),
}));

describe("Cart safe actions error handling (§5 API Readiness)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("simulatedCheckoutAction", () => {
    it("converts pipeline failure to ActionError and populates serverError", async () => {
      const { executeSimulatedCheckout } =
        await import("@/features/cart/services/checkout-pipeline.service");
      vi.mocked(executeSimulatedCheckout).mockResolvedValue({
        success: false,
        error: "Insufficient central stock during checkout.",
      });

      const result = await simulatedCheckoutAction({
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        items: [
          {
            id: "a0000000-0000-0000-0000-000000000001",
            quantity: 1,
            price: 1500,
            vendorName: "Vendor A",
            name: "Item 1",
            type: "product",
          },
        ],
        totalAmount: 1500,
        fulfillmentMethod: "store_pickup",
        paymentMethod: "bank_transfer",
      });

      expect(result.data).toBeUndefined();
      expect(result.serverError).toBe("Insufficient central stock during checkout.");
    });

    it("returns data on successful simulated checkout", async () => {
      const { executeSimulatedCheckout } =
        await import("@/features/cart/services/checkout-pipeline.service");
      vi.mocked(executeSimulatedCheckout).mockResolvedValue({
        success: true,
        orderId: "ord_12345",
        confirmationEmailSent: true,
      });

      const result = await simulatedCheckoutAction({
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        items: [
          {
            id: "a0000000-0000-0000-0000-000000000001",
            quantity: 1,
            price: 1500,
            vendorName: "Vendor A",
            name: "Item 1",
            type: "product",
          },
        ],
        totalAmount: 1500,
        fulfillmentMethod: "store_pickup",
        paymentMethod: "bank_transfer",
      });

      expect(result.serverError).toBeUndefined();
      expect(result.data?.success).toBe(true);
      if (result.data && "orderId" in result.data) {
        expect(result.data.orderId).toBe("ord_12345");
      }
    });
  });

  describe("sendCartSummaryEmailAction", () => {
    it("converts email service failure to ActionError and populates serverError", async () => {
      const { sendCartSummaryEmailService } =
        await import("@/features/cart/services/cart-email.service");
      vi.mocked(sendCartSummaryEmailService).mockResolvedValue({
        success: false,
        error: "SMTP server timed out.",
      });

      const result = await sendCartSummaryEmailAction({
        emailAddress: "customer@example.com",
        cartItems: [
          {
            id: "a0000000-0000-0000-0000-000000000001",
            name: "Product 1",
            price: 2000,
            imageUrl: null,
            quantity: 1,
            vendorName: "Vendor A",
            type: "product",
          },
        ],
        cartTotal: 2000,
        zeroShipping: true,
      });

      expect(result.data).toBeUndefined();
      expect(result.serverError).toBe("SMTP server timed out.");
    });
  });

  describe("syncCartPricesAction", () => {
    it("throws ActionError when syncCartPricesService throws", async () => {
      const { syncCartPricesService } = await import("@/features/cart/services/cart-sync.service");
      vi.mocked(syncCartPricesService).mockRejectedValue(new Error("Database connection lost"));

      const result = await syncCartPricesAction({
        productIds: ["a0000000-0000-0000-0000-000000000001"],
      });

      expect(result.data).toBeUndefined();
      expect(result.serverError).toBe("Failed to refresh cart prices.");
    });
  });

  describe("getCartCheckoutOptionsAction", () => {
    it("throws ActionError when getCheckoutOptionsService throws", async () => {
      const { getCheckoutOptionsService } =
        await import("@/features/cart/services/checkout-options.service");
      vi.mocked(getCheckoutOptionsService).mockRejectedValue(new Error("Database timeout"));

      const result = await getCartCheckoutOptionsAction({
        cartLines: [{ id: "item-1", quantity: 1, price: 100 }],
      });

      expect(result.data).toBeUndefined();
      expect(result.serverError).toBe("Failed to load checkout options.");
    });
  });
});
