import type {
  CarrierAdapter,
  Parcel,
  ShipmentCreationResult,
  ShipmentEvent,
  ShippingDestination,
  ShippingOrigin,
  ShippingRate,
} from "../../carrier.types";

/**
 * Shippo multi-carrier adapter.
 *
 * Shippo is a carrier aggregator — it calculates real-time rate quotes across
 * connected shipping carriers (DHL, FedEx, UPS, etc.).
 *
 * Required env:
 *   SHIPPO_API_KEY — Test key starts with "shippo_test_", production with "shippo_live_"
 *                    Get from: https://portal.goshippo.com/ (API Configuration > Developer Keys)
 */
export class ShippoAdapter implements CarrierAdapter {
  id = "shippo";
  name = "Shippo (Multi-Carrier)";

  private readonly baseUrl = "https://api.goshippo.com";

  private get apiKey(): string {
    const raw = (process.env.SHIPPO_API_KEY ?? "").trim();
    return raw.replace(/^(?:ShippoToken|Bearer)\s+/i, "");
  }

  private get authHeader(): string {
    return `ShippoToken ${this.apiKey}`;
  }

  async getRates(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
  ): Promise<ShippingRate[]> {
    const key = this.apiKey;
    if (!key) return [];

    const parcel = parcels[0];
    const weightKg = Math.max(0.1, Math.round((parcel.weightGrams / 1000) * 100) / 100);

    const normalizeCountry = (c?: string): string => {
      if (!c) return "LK";
      const u = c.trim().toUpperCase();
      if (u === "SRI LANKA" || u === "SRILANKA" || u === "LK") return "LK";
      if (u === "UNITED STATES" || u === "USA" || u === "US") return "US";
      if (u.length === 2) return u;
      return "LK";
    };

    const normalizeZip = (z?: string, c?: string): string => {
      if (z && z.trim().length > 0) return z.trim();
      const code = normalizeCountry(c);
      if (code === "LK") return "00100";
      if (code === "US") return "90210";
      return "00100";
    };

    const fromCountry = normalizeCountry(origin.country);
    const toCountry = normalizeCountry(destination.country);
    const isInternational = fromCountry !== toCountry;

    const payload: Record<string, unknown> = {
      address_from: {
        name: origin.name || "Store Origin Branch",
        street1: origin.street || "Main Street",
        city: origin.city || "Colombo",
        state: origin.state || "",
        zip: normalizeZip(origin.postalCode, origin.country),
        country: fromCountry,
        phone: origin.phone || "+94112345678",
      },
      address_to: {
        name: destination.name || "Customer",
        street1: destination.street || "Delivery Street",
        city: destination.city || "Colombo",
        state: destination.state || "",
        zip: normalizeZip(destination.postalCode, destination.country),
        country: toCountry,
        phone: destination.phone || "+94771234567",
      },
      parcels: [
        {
          length: parcel.lengthCm ? String(parcel.lengthCm) : "20",
          width: parcel.widthCm ? String(parcel.widthCm) : "15",
          height: parcel.heightCm ? String(parcel.heightCm) : "10",
          distance_unit: "cm",
          weight: String(weightKg),
          mass_unit: "kg",
        },
      ],
      async: false,
    };

    if (isInternational) {
      payload.customs_declaration = {
        contents_type: "MERCHANDISE",
        non_delivery_option: "RETURN",
        certify: true,
        certify_signer: origin.name || "Store Merchant",
        items: [
          {
            description: "Merchandise Goods",
            quantity: 1,
            net_weight: String(weightKg),
            mass_unit: "kg",
            value_amount: "50.00",
            value_currency: "USD",
            origin_country: fromCountry,
          },
        ],
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/shipments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[ShippoAdapter.getRates] API error:", res.status, err);
        return [];
      }

      const data = await res.json();
      const rawRates = data.rates ?? [];
      console.log(
        `[ShippoAdapter] Returned ${rawRates.length} rates for ${fromCountry} -> ${toCountry}`,
      );
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        console.log(`[ShippoAdapter] Carrier messages:`, JSON.stringify(data.messages));
      }

      const rates: ShippingRate[] = [];
      let lkrRate: number;
      try {
        const { getExchangeRatesMap } = await import("@/shared/currency/exchange-rates.service");
        const fxMap = await getExchangeRatesMap();
        lkrRate =
          fxMap["USD_LKR"] ||
          (process.env.USD_TO_LKR_RATE ? parseFloat(process.env.USD_TO_LKR_RATE) : 307.69);
      } catch {
        lkrRate = process.env.USD_TO_LKR_RATE
          ? parseFloat(process.env.USD_TO_LKR_RATE) || 307.69
          : 307.69;
      }

      for (const rate of data.rates ?? []) {
        const amountUsd = parseFloat(rate.amount ?? "0");
        const amountCents = Math.round(amountUsd * lkrRate * 100);

        const providerName = rate.provider ?? "Shippo";
        const serviceName = rate.servicelevel?.name ?? "Standard";

        rates.push({
          rateId: `shippo_${rate.object_id}`,
          carrierId: "shippo",
          carrierName: providerName,
          serviceCode: rate.servicelevel?.token ?? "STANDARD",
          serviceName: `${providerName} ${serviceName} (via Shippo)`,
          estimatedDays: rate.estimated_days ?? 5,
          amountCents,
          currency: "LKR",
        });
      }

      return rates;
    } catch (err) {
      console.error("[ShippoAdapter.getRates] Network error:", err);
      return [];
    }
  }

  async createShipment(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
    rateId: string,
  ): Promise<ShipmentCreationResult> {
    if (!this.apiKey) {
      throw new Error("[ShippoAdapter] SHIPPO_API_KEY is not configured.");
    }

    const shippoRateId = rateId.replace(/^shippo_/, "");

    const payload = {
      rate: shippoRateId,
      label_file_type: "PDF",
      async: false,
    };

    const res = await fetch(`${this.baseUrl}/transactions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`[ShippoAdapter] Failed to buy label: ${res.status} ${JSON.stringify(err)}`);
    }

    const transaction = await res.json();
    if (transaction.status !== "SUCCESS") {
      throw new Error(
        `[ShippoAdapter] Label purchase failed: ${JSON.stringify(transaction.messages)}`,
      );
    }

    return {
      shipmentExternalId: transaction.object_id,
      trackingNumber: transaction.tracking_number,
      trackingUrl:
        transaction.tracking_url_provider ??
        `https://goshippo.com/track/${transaction.tracking_number}`,
      labelUrl: transaction.label_url ?? "",
      estimatedDeliveryDate: transaction.eta ? new Date(transaction.eta) : null,
    };
  }

  async cancelShipment(shipmentExternalId: string): Promise<void> {
    if (!this.apiKey) return;
    await fetch(`${this.baseUrl}/refunds/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({ transaction: shipmentExternalId }),
    }).catch((err) => console.error("[ShippoAdapter.cancelShipment]", err));
  }

  async getTrackingEvents(trackingNumber: string): Promise<ShipmentEvent[]> {
    if (!this.apiKey) return [];

    try {
      const res = await fetch(
        `${this.baseUrl}/tracks/shippo/${encodeURIComponent(trackingNumber)}`,
        {
          headers: { Authorization: this.authHeader },
        },
      );

      if (!res.ok) return [];
      const data = await res.json();

      return (data.tracking_history ?? []).map(
        (history: {
          status?: string;
          status_details?: string;
          location?: { city?: string; state?: string; country?: string };
          status_date?: string;
        }) => ({
          status: history.status ?? "unknown",
          description: history.status_details ?? history.status ?? "Update",
          location:
            [history.location?.city, history.location?.country].filter(Boolean).join(", ") ||
            undefined,
          timestamp: history.status_date ?? new Date().toISOString(),
        }),
      );
    } catch (err) {
      console.error("[ShippoAdapter.getTrackingEvents]", err);
      return [];
    }
  }
}
