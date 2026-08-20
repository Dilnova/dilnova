import type {
  CarrierAdapter,
  Parcel,
  ShipmentCreationResult,
  ShipmentEvent,
  ShippingDestination,
  ShippingOrigin,
  ShippingRate,
} from "../carrier.types";

export class FlatRateAdapter implements CarrierAdapter {
  id = "flat_rate";
  name = "Standard Delivery";

  async getRates(
    _origin: ShippingOrigin,
    _destination: ShippingDestination,
    _parcels: Parcel[],
  ): Promise<ShippingRate[]> {
    void _origin;
    void _destination;
    void _parcels;
    return [
      {
        rateId: "flat_rate_standard",
        carrierId: "flat_rate",
        carrierName: "Standard Delivery",
        serviceCode: "STANDARD",
        serviceName: "Standard Delivery (3–5 business days)",
        estimatedDays: 5,
        amountCents: 500, // LKR / USD 5.00 — preserves current flat-rate checkout
        currency: "LKR",
      },
    ];
  }

  async createShipment(
    _origin: ShippingOrigin,
    _destination: ShippingDestination,
    _parcels: Parcel[],
    _rateId: string,
  ): Promise<ShipmentCreationResult> {
    void _origin;
    void _destination;
    void _parcels;
    void _rateId;
    const timestamp = Date.now();
    return {
      shipmentExternalId: `manual_${timestamp}`,
      trackingNumber: `TRK-${timestamp}`,
      trackingUrl: "",
      labelUrl: "",
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    };
  }

  async cancelShipment(_shipmentExternalId: string): Promise<void> {
    void _shipmentExternalId;
  }

  async getTrackingEvents(_trackingNumber: string): Promise<ShipmentEvent[]> {
    void _trackingNumber;
    return [
      {
        status: "label_created",
        description: "Order registered for standard shipping",
        timestamp: new Date().toISOString(),
      },
    ];
  }
}
