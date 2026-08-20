import { describe, expect, it } from "vitest";
import { isPaymentCompatibleWithFulfillment } from "@/features/organization/checkout-options.shared";

describe("Fulfillment & Payment Method Compatibility", () => {
  it("rejects 'Pay at Store' (requiresPickup: true) when Home Delivery (requiresBranch: false) is selected", () => {
    const payAtStore = { requiresDelivery: false, requiresPickup: true };
    const homeDelivery = { requiresBranch: false };

    const compatible = isPaymentCompatibleWithFulfillment(payAtStore, homeDelivery);
    expect(compatible).toBe(false);
  });

  it("allows 'Bank Transfer' for both Home Delivery and Store Pickup", () => {
    const bankTransfer = { requiresDelivery: false, requiresPickup: false };
    const homeDelivery = { requiresBranch: false };
    const storePickup = { requiresBranch: true };

    expect(isPaymentCompatibleWithFulfillment(bankTransfer, homeDelivery)).toBe(true);
    expect(isPaymentCompatibleWithFulfillment(bankTransfer, storePickup)).toBe(true);
  });

  it("rejects 'Cash on Delivery' (requiresDelivery: true) when Store Pickup (requiresBranch: true) is selected", () => {
    const cashOnDelivery = { requiresDelivery: true, requiresPickup: false };
    const storePickup = { requiresBranch: true };

    const compatible = isPaymentCompatibleWithFulfillment(cashOnDelivery, storePickup);
    expect(compatible).toBe(false);
  });

  it("allows 'Cash on Delivery' when Home Delivery (requiresBranch: false) is selected", () => {
    const cashOnDelivery = { requiresDelivery: true, requiresPickup: false };
    const homeDelivery = { requiresBranch: false };

    const compatible = isPaymentCompatibleWithFulfillment(cashOnDelivery, homeDelivery);
    expect(compatible).toBe(true);
  });
});
