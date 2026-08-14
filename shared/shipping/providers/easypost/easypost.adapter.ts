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
 * EasyPost multi-carrier adapter.
 *
 * EasyPost is a carrier aggregator — it shows rates from all carriers
 * connected to your account (DHL Express, FedEx, UPS, etc.).
 *
 * Required env:
 *   EASYPOST_API_KEY  — Test key starts with "EZTK", production with "EZAK"
 *                       Get from: https://app.easypost.com/account/settings
 *
 * Note: Live production rates for Sri Lanka origin require at least one
 * international carrier account (DHL Express LK, FedEx LK) connected in
 * the EasyPost dashboard under Shipping Settings > Carriers.
 */
export class EasyPostAdapter implements CarrierAdapter {
  id = "easypost";
  name = "EasyPost (Multi-Carrier)";

  private readonly apiKey: string;
  private readonly baseUrl = "https://api.easypost.com/v2";
  private readonly rateToShipmentCache = new Map<string, string>();

  constructor() {
    const key = process.env.EASYPOST_API_KEY ?? "";
    if (!key) {
      console.warn("[EasyPostAdapter] EASYPOST_API_KEY is not set. Rates will not be available.");
    }
    this.apiKey = key;
  }

  private get authHeader(): string {
    // EasyPost uses HTTP Basic Auth: API key as username, empty password
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`;
  }

  async getRates(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
  ): Promise<ShippingRate[]> {
    if (!this.apiKey) return [];

    const parcel = parcels[0]; // EasyPost rates one parcel at a time
    const weightOz = Math.max(1, Math.round((parcel.weightGrams / 28.3495) * 10) / 10);

    const payload = {
      shipment: {
        from_address: {
          street1: origin.street || "Main Street",
          city: origin.city,
          state: origin.state || "",
          zip: origin.postalCode || "",
          country: origin.country || "LK",
          phone: origin.phone || "",
          name: origin.name,
        },
        to_address: {
          street1: destination.street || "Delivery Street",
          city: destination.city,
          state: destination.state || "",
          zip: destination.postalCode || "",
          country: destination.country,
          name: destination.name,
        },
        parcel: {
          weight: weightOz, // EasyPost accepts ounces
          length: parcel.lengthCm ? parcel.lengthCm / 2.54 : undefined, // cm → inches
          width: parcel.widthCm ? parcel.widthCm / 2.54 : undefined,
          height: parcel.heightCm ? parcel.heightCm / 2.54 : undefined,
        },
      },
    };

    try {
      const res = await fetch(`${this.baseUrl}/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[EasyPostAdapter.getRates] API error:", res.status, err);
        return [];
      }

      const data = await res.json();
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

      if (data.id && Array.isArray(data.rates)) {
        for (const rate of data.rates) {
          if (rate.id) {
            this.rateToShipmentCache.set(rate.id, data.id);
          }
        }
      }

      for (const rate of data.rates ?? []) {
        const amountUsd = parseFloat(rate.rate ?? "0");
        const amountCents = Math.round(amountUsd * lkrRate * 100);

        rates.push({
          rateId: `easypost_${rate.id}`,
          carrierId: "easypost",
          carrierName: rate.carrier ?? "EasyPost",
          serviceCode: rate.service ?? "STANDARD",
          serviceName: `${rate.carrier ?? "EasyPost"} ${rate.service ?? "Standard"} (via EasyPost)`,
          estimatedDays: rate.delivery_days ?? rate.est_delivery_days ?? 7,
          amountCents,
          currency: "LKR",
        });
      }

      return rates;
    } catch (err) {
      console.error("[EasyPostAdapter.getRates] Network error:", err);
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
      throw new Error("[EasyPostAdapter] EASYPOST_API_KEY is not configured.");
    }

    // Strip prefix added in getRates
    const epRateId = rateId.replace(/^easypost_/, "");

    // Check if we have the cached shipment ID from getRates
    let shipmentId = this.rateToShipmentCache.get(epRateId);

    if (!shipmentId) {
      // Create shipment first if cache missed
      const parcel = parcels[0];
      const weightOz = Math.max(1, Math.round((parcel.weightGrams / 28.3495) * 10) / 10);
      const shipmentRes = await fetch(`${this.baseUrl}/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify({
          shipment: {
            from_address: {
              street1: origin.street || "Main Street",
              city: origin.city,
              state: origin.state || "",
              zip: origin.postalCode || "",
              country: origin.country || "LK",
              name: origin.name,
              phone: origin.phone || "",
            },
            to_address: {
              street1: destination.street || "Delivery Street",
              city: destination.city,
              state: destination.state || "",
              zip: destination.postalCode || "",
              country: destination.country,
              name: destination.name,
            },
            parcel: { weight: weightOz },
          },
        }),
      });

      if (!shipmentRes.ok) {
        throw new Error(`[EasyPostAdapter] Failed to create shipment: ${shipmentRes.status}`);
      }

      const shipmentData = await shipmentRes.json();
      shipmentId = shipmentData.id;
    }

    // Buy the label directly
    const buyRes = await fetch(`${this.baseUrl}/shipments/${shipmentId}/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({ rate: { id: epRateId } }),
    });

    if (!buyRes.ok) {
      const err = await buyRes.json().catch(() => ({}));
      throw new Error(
        `[EasyPostAdapter] Failed to buy label: ${buyRes.status} ${JSON.stringify(err)}`,
      );
    }

    const bought = await buyRes.json();
    const tracking = bought.tracking_code ?? bought.id;

    return {
      shipmentExternalId: bought.id,
      trackingNumber: tracking,
      trackingUrl: bought.tracker?.public_url ?? `https://track.easypost.com/${tracking}`,
      labelUrl: bought.postage_label?.label_url ?? "",
      estimatedDeliveryDate: bought.tracker?.est_delivery_date
        ? new Date(bought.tracker.est_delivery_date)
        : null,
    };
  }

  async cancelShipment(shipmentExternalId: string): Promise<void> {
    if (!this.apiKey) return;
    // EasyPost refunds via the refund endpoint
    await fetch(`${this.baseUrl}/shipments/${shipmentExternalId}/refund`, {
      method: "POST",
      headers: { Authorization: this.authHeader },
    }).catch((err) => console.error("[EasyPostAdapter.cancelShipment]", err));
  }

  async getTrackingEvents(trackingNumber: string): Promise<ShipmentEvent[]> {
    if (!this.apiKey) return [];

    try {
      const res = await fetch(
        `${this.baseUrl}/trackers?tracking_code=${encodeURIComponent(trackingNumber)}`,
        {
          headers: { Authorization: this.authHeader },
        },
      );
      if (!res.ok) return [];

      const data = await res.json();
      const tracker = data.trackers?.[0];
      if (!tracker) return [];

      return (tracker.tracking_details ?? []).map(
        (detail: {
          message?: string;
          status?: string;
          tracking_location?: { city?: string; state?: string; country?: string };
          datetime?: string;
        }) => ({
          status: detail.status ?? "unknown",
          description: detail.message ?? detail.status ?? "Update",
          location:
            [detail.tracking_location?.city, detail.tracking_location?.country]
              .filter(Boolean)
              .join(", ") || undefined,
          timestamp: detail.datetime ?? new Date().toISOString(),
        }),
      );
    } catch (err) {
      console.error("[EasyPostAdapter.getTrackingEvents]", err);
      return [];
    }
  }
}
