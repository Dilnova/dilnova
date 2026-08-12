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

  private readonly apiKey: string;
  private readonly baseUrl = "https://api.goshippo.com";

  constructor() {
    const key = process.env.SHIPPO_API_KEY ?? "";
    if (!key) {
      console.warn("[ShippoAdapter] SHIPPO_API_KEY is not set. Rates will not be available.");
    }
    this.apiKey = key;
  }

  private get authHeader(): string {
    return `ShippoToken ${this.apiKey}`;
  }

  async getRates(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
  ): Promise<ShippingRate[]> {
    if (!this.apiKey) return [];

    const parcel = parcels[0];
    const weightKg = Math.max(0.1, Math.round((parcel.weightGrams / 1000) * 100) / 100);

    const payload = {
      address_from: {
        name: origin.name,
        street1: origin.street || "Main Street",
        city: origin.city,
        state: origin.state || "",
        zip: origin.postalCode || "",
        country: origin.country || "LK",
        phone: origin.phone || "",
      },
      address_to: {
        name: destination.name,
        street1: destination.street || "Delivery Street",
        city: destination.city,
        state: destination.state || "",
        zip: destination.postalCode || "",
        country: destination.country,
        phone: destination.phone || "",
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
      const rates: ShippingRate[] = [];
      let lkrRate = 307.69;
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
