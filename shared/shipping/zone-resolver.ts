import type { ShippingDestination } from "./carrier.types";
import { getEMSServiceZone, isDomesticCountry } from "./providers/slpost/slpost-rates";

export function resolveShippingZone(destination: ShippingDestination): string {
  const country = destination.country || "LK";

  if (isDomesticCountry(country)) {
    return "domestic";
  }

  const emsZone = getEMSServiceZone(country);
  return `ems_zone_${emsZone.zone}`;
}

export function getZoneDisplayName(zone: string): string {
  if (zone === "domestic") {
    return "SL Post Inland Parcel (Island-wide)";
  }

  const match = zone.match(/ems_zone_(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    switch (num) {
      case 1:
        return "SL Post EMS Express (Zone 1 - South Asia)";
      case 2:
        return "SL Post EMS Express (Zone 2 - Southeast Asia)";
      case 3:
        return "SL Post EMS Express (Zone 3 - East Asia & Middle East)";
      case 4:
        return "SL Post EMS Express (Zone 4 - Europe)";
      case 5:
        return "SL Post EMS Express (Zone 5 - Americas)";
      case 6:
        return "SL Post EMS Express (Zone 6 - Africa & Oceania)";
    }
  }

  return "SL Post International EMS";
}
