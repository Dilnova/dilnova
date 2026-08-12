import type {
  CarrierAdapter,
  Parcel,
  ShipmentCreationResult,
  ShipmentEvent,
  ShippingDestination,
  ShippingOrigin,
  ShippingRate,
} from "../../carrier.types";
import { shipments } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateDomesticParcelFee,
  calculateEMSParcelFee,
  isDomesticCountry,
} from "./slpost-rates";

export class SLPostAdapter implements CarrierAdapter {
  id = "slpost";
  name = "Sri Lanka Post";

  async getRates(
    origin: ShippingOrigin,
    destination: ShippingDestination,
    parcels: Parcel[],
  ): Promise<ShippingRate[]> {
    const country = destination.country || "LK";
    const totalWeightGrams = parcels.reduce((sum, p) => sum + p.weightGrams, 0);

    if (isDomesticCountry(country)) {
      const baseParcelCents = calculateDomesticParcelFee(totalWeightGrams);
      const registeredCents = baseParcelCents + 6000; // Rs. 60 official registration fee

      const originCityNorm = (origin.city || "").trim().toLowerCase();
      const destCityNorm = (destination.city || "").trim().toLowerCase();
      const originStateNorm = (origin.state || "").trim().toLowerCase();
      const destStateNorm = (destination.state || "").trim().toLowerCase();

      const isSameCity =
        originCityNorm !== "" && destCityNorm !== "" && originCityNorm === destCityNorm;
      const isSameProvince =
        (originStateNorm !== "" && destStateNorm !== "" && originStateNorm === destStateNorm) ||
        isSameCity;

      const totalKg = Math.ceil(totalWeightGrams / 1000);
      let speedPostCents: number;

      if (isSameCity) {
        // Metro Same City Courier: Base Rs. 350 for 1st kg + Rs. 80 per extra kg
        speedPostCents = 35000 + Math.max(0, totalKg - 1) * 8000;
      } else if (isSameProvince) {
        // Intra-Province Courier: Base Rs. 400 for 1st kg + Rs. 90 per extra kg
        speedPostCents = 40000 + Math.max(0, totalKg - 1) * 9000;
      } else {
        // Outstation / Inter-Province Courier: Base Rs. 550 for 1st kg + Rs. 150 per extra kg
        speedPostCents = 55000 + Math.max(0, totalKg - 1) * 15000;
      }

      const destRegionLabel = destination.state
        ? destination.state.trim()
        : destination.city
          ? destination.city.trim()
          : "Outstation";

      return [
        {
          rateId: "slpost_domestic_parcel",
          carrierId: "slpost",
          carrierName: "Sri Lanka Post",
          serviceCode: "DOMESTIC_PARCEL",
          serviceName: "SL Post Inland Parcel (Standard)",
          estimatedDays: 4,
          amountCents: baseParcelCents,
          currency: "LKR",
        },
        {
          rateId: "slpost_speed_post",
          carrierId: "slpost",
          carrierName: "Sri Lanka Post",
          serviceCode: "SPEED_POST",
          serviceName: !isSameProvince
            ? `Speed Post Courier (Outstation Delivery to ${destRegionLabel})`
            : isSameCity
              ? "Speed Post Courier (Same City Metro Delivery)"
              : `Speed Post Courier (Same Province Delivery to ${destRegionLabel})`,
          estimatedDays: !isSameProvince ? 2 : 1,
          amountCents: speedPostCents,
          currency: "LKR",
        },
        {
          rateId: "slpost_registered_parcel",
          carrierId: "slpost",
          carrierName: "Sri Lanka Post",
          serviceCode: "REGISTERED_PARCEL",
          serviceName: "SL Post Registered Parcel Post (Tracked + Rs 60 Reg Fee)",
          estimatedDays: 3,
          amountCents: registeredCents,
          currency: "LKR",
        },
      ];
    } else {
      const { amountCents, zone } = calculateEMSParcelFee(totalWeightGrams, country);
      return [
        {
          rateId: `slpost_ems_z${zone.zone}`,
          carrierId: "slpost",
          carrierName: "Sri Lanka Post",
          serviceCode: `EMS_ZONE_${zone.zone}`,
          serviceName: `SL Post EMS Express (${zone.name})`,
          estimatedDays: zone.estimatedDays,
          amountCents,
          currency: "LKR",
        },
      ];
    }
  }

  async createShipment(
    _origin: ShippingOrigin,
    _destination: ShippingDestination,
    _parcels: Parcel[],
    rateId: string,
  ): Promise<ShipmentCreationResult> {
    void _origin;
    void _destination;
    void _parcels;
    void rateId;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trackingNumber = `SLP-${todayStr}-${randomHex}`;

    return {
      shipmentExternalId: trackingNumber,
      trackingNumber,
      trackingUrl: `https://slpost.gov.lk/track/?item=${trackingNumber}`,
      labelUrl: `/api/shipping/label-pdf?tracking=${trackingNumber}`,
      estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  async cancelShipment(shipmentExternalId: string): Promise<void> {
    try {
      const { db } = await import("@/shared/db/client");
      await db
        .update(shipments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(shipments.shipmentExternalId, shipmentExternalId));
    } catch (err) {
      console.error("[SLPostAdapter.cancelShipment] Error:", err);
    }
  }

  async getTrackingEvents(trackingNumber: string): Promise<ShipmentEvent[]> {
    try {
      const { db } = await import("@/shared/db/client");
      const [shipment] = await db
        .select({ events: shipments.events })
        .from(shipments)
        .where(eq(shipments.trackingNumber, trackingNumber))
        .limit(1);

      if (shipment?.events && shipment.events.length > 0) {
        return shipment.events;
      }
    } catch (err) {
      console.error("[SLPostAdapter.getTrackingEvents] Error:", err);
    }

    return [
      {
        status: "accepted",
        description: "Parcel registered at Sri Lanka Post Postal Exchange",
        timestamp: new Date().toISOString(),
      },
    ];
  }
}
