export interface ShippingOrigin {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2, e.g. "LK", "US"
  phone?: string;
  isFallback?: boolean;
}

export type ShippingDestination = ShippingOrigin;

export interface Parcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShippingRate {
  rateId: string;
  carrierId: string;
  carrierName: string;
  serviceCode: string;
  serviceName: string;
  estimatedDays: number;
  amountCents: number;
  currency: string;
}

export interface ShipmentCreationResult {
  shipmentExternalId: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  estimatedDeliveryDate: Date | null;
}

export interface ShipmentEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

export interface CarrierAdapter {
  id: string;
  name: string;
  getRates(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
  ): Promise<ShippingRate[]>;
  createShipment(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
    rateId: string,
  ): Promise<ShipmentCreationResult>;
  cancelShipment(shipmentExternalId: string): Promise<void>;
  getTrackingEvents(trackingNumber: string): Promise<ShipmentEvent[]>;
}
