import type { Parcel, ShippingDestination, ShippingOrigin, ShippingRate } from "./carrier.types";
import { getCarrier } from "./carrier-registry";

export interface RateEngineItem {
  id: string;
  quantity: number;
  weightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface VendorShippingQuote {
  vendorOrgId: string;
  originBranchId: string | null;
  rates: ShippingRate[];
  selectedRate: ShippingRate;
  totalCents: number;
  isFallbackOrigin?: boolean;
  originCity: string;
  originState: string;
}

export function parseBranchToOrigin(
  branch?: {
    name: string;
    address: string | null;
    phone?: string | null;
  } | null,
): ShippingOrigin {
  if (!branch || !branch.address || !branch.address.trim()) {
    return {
      name: branch?.name ?? "Main Origin Branch",
      street: "Main Street",
      city: "Colombo",
      state: "Western",
      postalCode: "00100",
      country: process.env.SHIPPING_ORIGIN_COUNTRY ?? "LK",
      phone: branch?.phone ?? undefined,
      isFallback: true,
    };
  }

  const parts = branch.address.split(",").map((s) => s.trim());
  const hasCity = parts.length >= 2 && parts[1].length > 0;
  const hasState = parts.length >= 3 && parts[2].length > 0;

  return {
    name: branch.name,
    street: parts[0] || branch.address,
    city: hasCity ? parts[1] : "Colombo",
    state: hasState ? parts[2] : "Western",
    postalCode: parts[3] || "00100",
    country: parts[4] || (process.env.SHIPPING_ORIGIN_COUNTRY ?? "LK"),
    phone: branch.phone ?? undefined,
    isFallback: !hasCity,
  };
}

export function consolidateParcels(items: RateEngineItem[]): Parcel {
  let totalWeightGrams = 0;
  let maxL = 10;
  let maxW = 10;
  let totalH = 0;

  for (const item of items) {
    const qty = Math.max(1, item.quantity);
    const weight = item.weightGrams && item.weightGrams > 0 ? item.weightGrams : 100;
    totalWeightGrams += weight * qty;

    const l = item.lengthCm ?? 10;
    const w = item.widthCm ?? 10;
    const h = item.heightCm ?? 10;

    maxL = Math.max(maxL, l);
    maxW = Math.max(maxW, w);
    totalH += h * qty;
  }

  return {
    weightGrams: Math.max(100, totalWeightGrams),
    lengthCm: Math.max(5, maxL),
    widthCm: Math.max(5, maxW),
    heightCm: Math.max(5, totalH),
  };
}

export async function computeMultiVendorRates(opts: {
  itemsByVendor: Map<string, RateEngineItem[]>;
  destination: ShippingDestination;
  vendorBranchMap: Map<
    string,
    { id: string; name: string; address: string | null; phone: string | null }
  >;
  carrierId?: string;
}): Promise<{ quotes: VendorShippingQuote[]; totalShippingCents: number }> {
  const quotes: VendorShippingQuote[] = [];

  for (const [vendorOrgId, items] of opts.itemsByVendor.entries()) {
    const branch = opts.vendorBranchMap.get(vendorOrgId);
    const origin = parseBranchToOrigin(branch);
    if (origin.isFallback) {
      console.warn(
        `[rate-engine] Vendor org "${vendorOrgId}" branch address is missing city details. Defaulting origin to Colombo, Western for rate calculation.`,
      );
    }

    const parcel = consolidateParcels(items);
    const primaryCarrier = getCarrier(opts.carrierId);
    let rates = await primaryCarrier.getRates(origin, opts.destination, [parcel]);

    // If API keys for EasyPost or Shippo exist and no specific carrier override was requested,
    // query them alongside SL Post to offer multi-carrier rates
    if (!opts.carrierId) {
      if (process.env.EASYPOST_API_KEY) {
        try {
          const ep = getCarrier("easypost");
          const epRates = await ep.getRates(origin, opts.destination, [parcel]);
          rates = [...rates, ...epRates];
        } catch (err) {
          console.warn("[rate-engine] Failed to fetch EasyPost rates:", err);
        }
      }
      if (process.env.SHIPPO_API_KEY) {
        try {
          const shippo = getCarrier("shippo");
          const shippoRates = await shippo.getRates(origin, opts.destination, [parcel]);
          rates = [...rates, ...shippoRates];
        } catch (err) {
          console.warn("[rate-engine] Failed to fetch Shippo rates:", err);
        }
      }
    }

    if (rates.length === 0) {
      throw new Error(`No shipping rates available for vendor ${vendorOrgId}`);
    }

    const selectedRate = rates[0];

    quotes.push({
      vendorOrgId,
      originBranchId: branch?.id ?? null,
      rates,
      selectedRate,
      totalCents: selectedRate.amountCents,
      isFallbackOrigin: origin.isFallback,
      originCity: origin.city,
      originState: origin.state,
    });
  }

  const totalShippingCents = quotes.reduce((sum, q) => sum + q.totalCents, 0);
  return { quotes, totalShippingCents };
}
