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
  rateLimit: vi.fn().mockResolvedValue(undefined),
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

describe("Checkout Double-Submit & Idempotency Enforcement", () => {
  const mockCtx = { userId: "user_customer_123" };

  const createInput = (key?: string) => ({
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
    idempotencyKey: key,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(currentUser).mockResolvedValue({
      id: "user_customer_123",
      fullName: "Jane Doe",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    } as unknown as ReturnType<typeof currentUser> extends Promise<infer U> ? U : never);

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
      orderId: "ord_verified_first_123",
      grandTotalCents: 5000,
      serverSubtotalCents: 5000,
      vendorSubtotals: { "org-1": 5000 },
    });
  });

  it("successfully completes checkout on the first submission", async () => {
    const key = "e9999999-0000-0000-0000-000000000001";
    const result = await executeSimulatedCheckout(createInput(key), mockCtx);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orderId).toBe("ord_verified_first_123");
    }
    expect(executeCheckoutWithRetry).toHaveBeenCalledTimes(1);
  });

  it("returns cached successful order on duplicate submission with the same idempotency key", async () => {
    const key = "e9999999-0000-0000-0000-000000000002";

    // First request
    const firstResult = await executeSimulatedCheckout(createInput(key), mockCtx);
    expect(firstResult.success).toBe(true);
    expect(executeCheckoutWithRetry).toHaveBeenCalledTimes(1);

    // Second request (e.g. double-click or network retry with same key)
    const duplicateResult = await executeSimulatedCheckout(createInput(key), mockCtx);

    expect(duplicateResult.success).toBe(true);
    if (duplicateResult.success) {
      expect(duplicateResult.orderId).toBe("ord_verified_first_123");
    }

    // Crucial: executeCheckoutWithRetry should NOT be called a second time
    expect(executeCheckoutWithRetry).toHaveBeenCalledTimes(1);
  });

  it("releases idempotency lock on transaction failure so subsequent retry can succeed", async () => {
    const key = "e9999999-0000-0000-0000-000000000003";

    // First attempt fails at transaction layer (e.g. database deadlock or stock issue)
    vi.mocked(executeCheckoutWithRetry).mockResolvedValueOnce({
      success: false,
      error: "Temporary lock conflict. Please retry.",
    });

    const firstResult = await executeSimulatedCheckout(createInput(key), mockCtx);
    expect(firstResult.success).toBe(false);

    // Second attempt with same key should be allowed to retry (not permanently locked)
    vi.mocked(executeCheckoutWithRetry).mockResolvedValueOnce({
      success: true,
      orderId: "ord_retry_success_456",
      grandTotalCents: 5000,
      serverSubtotalCents: 5000,
      vendorSubtotals: { "org-1": 5000 },
    });

    const retryResult = await executeSimulatedCheckout(createInput(key), mockCtx);
    expect(retryResult.success).toBe(true);
    if (retryResult.success) {
      expect(retryResult.orderId).toBe("ord_retry_success_456");
    }
  });

  it("generates deterministic fallback fingerprint when idempotencyKey is omitted", async () => {
    const inputWithoutKey = createInput(); // no idempotencyKey provided

    // First call without key
    const first = await executeSimulatedCheckout(inputWithoutKey, mockCtx);
    expect(first.success).toBe(true);

    // Second identical call immediately after should return cached result
    const second = await executeSimulatedCheckout(inputWithoutKey, mockCtx);
    expect(second.success).toBe(true);
    expect(executeCheckoutWithRetry).toHaveBeenCalledTimes(1);
  });
});
