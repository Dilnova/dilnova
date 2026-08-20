import type {
  CarrierAdapter,
  Parcel,
  ShipmentCreationResult,
  ShipmentEvent,
  ShippingDestination,
  ShippingOrigin,
  ShippingRate,
} from "../../carrier.types";
import { SLPostAdapter } from "../../providers/slpost/slpost.adapter";

export class BuiltInAdapter implements CarrierAdapter {
  id = "builtin";
  name = "Sri Lanka Post & Express Fulfillment";
  private slpost = new SLPostAdapter();

  async getRates(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
  ): Promise<ShippingRate[]> {
    return this.slpost.getRates(origin, destination, parcels);
  }

  async createShipment(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
    rateId: string,
  ): Promise<ShipmentCreationResult> {
    return this.slpost.createShipment(origin, destination, parcels, rateId);
  }

  async cancelShipment(shipmentExternalId: string): Promise<void> {
    return this.slpost.cancelShipment(shipmentExternalId);
  }

  async getTrackingEvents(trackingNumber: string): Promise<ShipmentEvent[]> {
    return this.slpost.getTrackingEvents(trackingNumber);
  }
}
