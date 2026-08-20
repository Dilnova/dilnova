import { describe, expect, it } from "vitest";
import { FlatRateAdapter } from "@/shared/shipping/adapters/flat-rate.adapter";
import { getCarrier } from "@/shared/shipping/carrier-registry";
import {
  computeMultiVendorRates,
  consolidateParcels,
  parseBranchToOrigin,
} from "@/shared/shipping/rate-engine";
import { calculateCheckoutTotals } from "@/features/billing/checkout-totals";
import { SLPostAdapter } from "@/shared/shipping/providers/slpost/slpost.adapter";

describe("Shipping Carrier Abstraction & Rate Engine", () => {
  it("FlatRateAdapter returns standard 500 cents rate", async () => {
    const adapter = new FlatRateAdapter();
    const rates = await adapter.getRates(
      {
        name: "Origin",
        street: "123 St",
        city: "Colombo",
        state: "Western",
        postalCode: "00100",
        country: "LK",
      },
      {
        name: "Dest",
        street: "456 St",
        city: "Kandy",
        state: "Central",
        postalCode: "20000",
        country: "LK",
      },
      [{ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    );

    expect(rates).toHaveLength(1);
    expect(rates[0].amountCents).toBe(500);
    expect(rates[0].carrierId).toBe("flat_rate");
  });

  it("getCarrier returns slpost adapter by default", () => {
    const carrier = getCarrier();
    expect(carrier.id).toBe("slpost");
  });

  it("SLPostAdapter calculates rates based on Sri Lanka Post official tariffs", async () => {
    const adapter = new SLPostAdapter();

    // Domestic 500g -> multiple services (Speed Post, Registered Parcel, Standard Inland)
    const domesticRates = await adapter.getRates(
      {
        name: "Vendor",
        street: "123 St",
        city: "Colombo",
        state: "Western",
        postalCode: "00100",
        country: "LK",
      },
      {
        name: "Buyer",
        street: "456 St",
        city: "Kandy",
        state: "Central",
        postalCode: "20000",
        country: "LK",
      },
      [{ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    );
    expect(domesticRates.length).toBe(3);
    const standardRate = domesticRates.find((r) => r.serviceCode === "DOMESTIC_PARCEL");
    expect(standardRate?.amountCents).toBe(21500);
    expect(standardRate?.serviceName).toContain("SL Post Inland Parcel");

    // EMS to UK (Zone 4) 500g -> LKR 2,800.00 (280,000 cents)
    const ukRates = await adapter.getRates(
      {
        name: "Vendor",
        street: "123 St",
        city: "Colombo",
        state: "Western",
        postalCode: "00100",
        country: "LK",
      },
      {
        name: "Buyer",
        street: "456 St",
        city: "London",
        state: "London",
        postalCode: "EC1A",
        country: "GB",
      },
      [{ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    );
    expect(ukRates[0].amountCents).toBe(280000);
    expect(ukRates[0].serviceName).toContain("Zone 4 (Europe)");
  });

  it("SLPostAdapter creates shipment with tracking number SLP-*", async () => {
    const adapter = new SLPostAdapter();
    const shipment = await adapter.createShipment(
      {
        name: "Vendor",
        street: "123 St",
        city: "Colombo",
        state: "Western",
        postalCode: "00100",
        country: "LK",
      },
      {
        name: "Buyer",
        street: "456 St",
        city: "Kandy",
        state: "Central",
        postalCode: "20000",
        country: "LK",
      },
      [{ weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10 }],
      "slpost_domestic_parcel",
    );

    expect(shipment.trackingNumber).toMatch(/^SLP-\d{8}-[A-Z0-9]+$/);
    expect(shipment.trackingUrl).toContain("slpost.gov.lk");
  });

  it("consolidateParcels calculates combined weight and dimensions", () => {
    const parcel = consolidateParcels([
      { id: "1", quantity: 2, weightGrams: 300, lengthCm: 15, widthCm: 10, heightCm: 5 },
      { id: "2", quantity: 1, weightGrams: 400, lengthCm: 20, widthCm: 12, heightCm: 8 },
    ]);

    expect(parcel.weightGrams).toBe(1000);
    expect(parcel.lengthCm).toBe(20);
    expect(parcel.widthCm).toBe(12);
    expect(parcel.heightCm).toBe(18);
  });

  it("parseBranchToOrigin parses address string cleanly", () => {
    const origin = parseBranchToOrigin({
      name: "Colombo Main",
      address: "10 Main Street, Colombo, Western, 00100",
      phone: "+94771234567",
    });

    expect(origin.name).toBe("Colombo Main");
    expect(origin.street).toBe("10 Main Street");
    expect(origin.city).toBe("Colombo");
    expect(origin.state).toBe("Western");
    expect(origin.postalCode).toBe("00100");
  });

  it("computeMultiVendorRates computes per-vendor rates and sums total", async () => {
    const itemsByVendor = new Map([
      ["org_1", [{ id: "p1", quantity: 1, weightGrams: 500 }]],
      ["org_2", [{ id: "p2", quantity: 2, weightGrams: 200 }]],
    ]);
    const vendorBranchMap = new Map([
      ["org_1", { id: "b1", name: "Branch 1", address: "St 1, City 1", phone: null }],
      ["org_2", { id: "b2", name: "Branch 2", address: "St 2, City 2", phone: null }],
    ]);

    const result = await computeMultiVendorRates({
      itemsByVendor,
      destination: {
        name: "Buyer",
        street: "St 3",
        city: "Galle",
        state: "Southern",
        postalCode: "80000",
        country: "LK",
      },
      vendorBranchMap,
    });

    expect(result.quotes).toHaveLength(2);
    // org_1: 500g -> 21,500 cents. org_2: 400g -> 21,500 cents. Total = 43,000 cents (LKR 430.00)
    expect(result.totalShippingCents).toBe(43000);
  });

  it("calculateCheckoutTotals respects shippingOverrideCents", () => {
    const totals = calculateCheckoutTotals(4000, false, 0, 750);
    expect(totals.subtotalAmount).toBe(4000);
    expect(totals.shippingAmount).toBe(750);
    expect(totals.grandTotal).toBe(4750);
  });
});
