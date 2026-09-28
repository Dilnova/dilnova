import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeSimulatedCheckout } from "@/features/cart/services/checkout-pipeline.service";
import { currentUser } from "@clerk/nextjs/server";
import { validateAndPrepareCartItems } from "@/features/cart/services/checkout-validation.service";
import { fetchBranchesForOrgs } from "@/features/cart/services/checkout-options.service";
import { resolveCheckoutOptionsForOrgs } from "@/features/organization/checkout-options";
import { calculateAndValidateCheckoutShipping } from "@/features/cart/services/checkout-shipping.service";
import { executeCheckoutWithRetry } from "@/features/cart/services/checkout-transaction.service";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/features/cart/services/checkout-validation.service", () => ({
  validateAndPrepareCartItems: vi.fn(),
  processCheckoutSuccess: vi.fn().mockImplementation(({ orderId }) =>
    Promise.resolve({
      success: true,
      orderId,
      confirmationEmailSent: true,
    }),
  ),
}));

vi.mock("@/features/cart/services/checkout-options.service", () => ({
  fetchBranchesForOrgs: vi.fn(),
}));

vi.mock("@/features/organization/checkout-options", () => ({
  resolveCheckoutOptionsForOrgs: vi.fn(),
}));

vi.mock("@/features/billing/tax-engine", () => ({
  buildCartTaxBreakdown: vi.fn().mockResolvedValue({
    totalTaxCents: 0,
    ratesApplied: [],
  }),
}));

vi.mock("@/features/billing/bank-transfer.server", () => ({
  getBankTransferDetailsForOrgs: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/features/cart/services/checkout-shipping.service", () => ({
  calculateAndValidateCheckoutShipping: vi.fn(),
}));

vi.mock("@/features/cart/services/checkout-transaction.service", () => ({
  executeCheckoutWithRetry: vi.fn(),
}));

describe("Simulated Checkout Pipeline (Critical Revenue Path)", () => {
  const baseInput = {
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    items: [
      {
        id: "prod-1",
        name: "Test Widget",
        price: 2500,
        quantity: 2,
        vendorName: "Acme Corp",
        type: "product",
      },
    ],
    totalAmount: 5000,
    fulfillmentMethod: "pickup",
    paymentMethod: "cash_on_pickup",
    pickupBranchId: "branch-1",
    shippingAddress: null,
    shippingAddressLine2: null,
    shippingCity: null,
    shippingState: null,
    shippingPostalCode: null,
    shippingCountry: null,
    shippingPhone: null,
    shippingPhone2: null,
    checkoutVendorOrgId: "org-1",
    selectedRateId: null,
    presentmentCurrency: "LKR",
  };

  const mockCtx = { userId: "user_customer_123" };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(currentUser).mockResolvedValue({
      id: "user_customer_123",
      fullName: "Jane Doe",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    } as never);

    vi.mocked(validateAndPrepareCartItems).mockResolvedValue({
      success: true,
      verifiedItems: [
        {
          id: "prod-1",
          name: "Test Widget",
          price: 2500,
          quantity: 2,
          vendorOrgId: "org-1",
          type: "product",
          vendorBaseCurrency: "LKR",
        },
      ],
      serverSubtotal: 5000,
      vendorOrgIds: ["org-1"],
      uniqueItemIds: ["prod-1"],
      availabilityCatalog: new Map(),
    });

    vi.mocked(fetchBranchesForOrgs).mockResolvedValue({
      branchRows: [{ id: "branch-1", orgId: "org-1", name: "Main Store" }],
      branchesByOrg: new Map([["org-1", [{ id: "branch-1", orgId: "org-1", name: "Main Store" }]]]),
    });

    vi.mocked(resolveCheckoutOptionsForOrgs).mockResolvedValue({
      fulfillment: [
        {
          id: "pickup",
          label: "In-Store Pickup",
          requiresBranch: true,
          zeroShipping: true,
        },
      ],
      payment: [
        {
          id: "cash_on_pickup",
          label: "Cash on Pickup",
          requiresPickup: true,
          requiresDelivery: false,
        },
      ],
    });

    vi.mocked(calculateAndValidateCheckoutShipping).mockResolvedValue({
      success: true,
      serverShippingCents: 0,
      clientShippingCents: 0,
      destinationTier: "pickup",
    });

    vi.mocked(executeCheckoutWithRetry).mockResolvedValue({
      success: true,
      orderId: "order_xyz_123",
    });
  });

  it("fails if the user session cannot be resolved in Clerk", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const result = await executeSimulatedCheckout(baseInput, mockCtx);
    expect(result).toEqual({
      success: false,
      error: "Authentication session is invalid. Please sign in again.",
    });
  });

  it("fails if the authenticated user has no primary email address", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_customer_123",
      emailAddresses: [],
    } as never);

    const result = await executeSimulatedCheckout(baseInput, mockCtx);
    expect(result).toEqual({
      success: false,
      error:
        "Your account does not have an email address. Please update your profile before checkout.",
    });
  });

  it("fails when cart items fail stock/catalog verification", async () => {
    vi.mocked(validateAndPrepareCartItems).mockResolvedValue({
      success: false,
      error: "Item 'Test Widget' is out of stock.",
    });

    const result = await executeSimulatedCheckout(baseInput, mockCtx);
    expect(result).toEqual({
      success: false,
      error: "Item 'Test Widget' is out of stock.",
    });
  });

  it("fails if selected fulfillment option is not offered by the vendor", async () => {
    const invalidInput = { ...baseInput, fulfillmentMethod: "non_existent_fulfillment" };
    const result = await executeSimulatedCheckout(invalidInput, mockCtx);

    expect(result).toEqual({
      success: false,
      error: "Selected fulfillment method is not available for this cart.",
    });
  });

  it("fails if selected payment method is not offered by the vendor", async () => {
    const invalidInput = { ...baseInput, paymentMethod: "non_existent_payment" };
    const result = await executeSimulatedCheckout(invalidInput, mockCtx);

    expect(result).toEqual({
      success: false,
      error: "Selected payment method is not available for this cart.",
    });
  });

  it("fails when client grandTotal does not match server calculation (anti-tampering)", async () => {
    // Client claims total is 1000, but server calculated 5000
    const tamperedInput = { ...baseInput, totalAmount: 1000 };
    const result = await executeSimulatedCheckout(tamperedInput, mockCtx);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Checkout total mismatch");
    }
  });

  it("completes checkout successfully and returns orderId", async () => {
    const result = await executeSimulatedCheckout(baseInput, mockCtx);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orderId).toBe("order_xyz_123");
      expect(result.confirmationEmailSent).toBe(true);
    }
    expect(executeCheckoutWithRetry).toHaveBeenCalledTimes(1);
  });
});
