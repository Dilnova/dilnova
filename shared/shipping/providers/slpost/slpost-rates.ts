/**
 * Official Sri Lanka Post (slpost.gov.lk) Rate Tables
 * Domestic Parcel Post effective 2026-02-09
 * International EMS Express Mail Service tariffs
 */

export interface DomesticWeightTier {
  maxWeightGrams: number;
  amountCents: number; // in LKR cents
}

// Domestic Inland Parcel Post Rate Table (in LKR Cents)
export const DOMESTIC_PARCEL_TIERS: DomesticWeightTier[] = [
  { maxWeightGrams: 500, amountCents: 21500 }, // LKR 215.00
  { maxWeightGrams: 1000, amountCents: 31500 }, // LKR 315.00
  { maxWeightGrams: 2000, amountCents: 41500 }, // LKR 415.00
  { maxWeightGrams: 3000, amountCents: 61500 }, // LKR 615.00
  { maxWeightGrams: 5000, amountCents: 101500 }, // LKR 1,015.00
  { maxWeightGrams: 10000, amountCents: 171500 }, // LKR 1,715.00
  { maxWeightGrams: 20000, amountCents: 291500 }, // LKR 2,915.00
  { maxWeightGrams: 30000, amountCents: 491500 }, // LKR 4,915.00
];

export interface EMSTariffZone {
  zone: number;
  name: string;
  baseAmountCents: number; // first 500g in LKR cents
  perAdditional500gCents: number; // each additional 500g in LKR cents
  estimatedDays: number;
}

// International EMS Zone Tariff Table (in LKR Cents)
export const EMS_ZONE_TARIFFS: Record<number, EMSTariffZone> = {
  1: {
    zone: 1,
    name: "Zone 1 (South Asia)",
    baseAmountCents: 150000, // LKR 1,500
    perAdditional500gCents: 40000, // LKR 400
    estimatedDays: 4,
  },
  2: {
    zone: 2,
    name: "Zone 2 (Southeast Asia)",
    baseAmountCents: 180000, // LKR 1,800
    perAdditional500gCents: 50000, // LKR 500
    estimatedDays: 6,
  },
  3: {
    zone: 3,
    name: "Zone 3 (East Asia & Middle East)",
    baseAmountCents: 220000, // LKR 2,200
    perAdditional500gCents: 65000, // LKR 650
    estimatedDays: 6,
  },
  4: {
    zone: 4,
    name: "Zone 4 (Europe)",
    baseAmountCents: 280000, // LKR 2,800
    perAdditional500gCents: 80000, // LKR 800
    estimatedDays: 8,
  },
  5: {
    zone: 5,
    name: "Zone 5 (Americas)",
    baseAmountCents: 350000, // LKR 3,500
    perAdditional500gCents: 100000, // LKR 1,000
    estimatedDays: 9,
  },
  6: {
    zone: 6,
    name: "Zone 6 (Africa & Oceania)",
    baseAmountCents: 300000, // LKR 3,000
    perAdditional500gCents: 85000, // LKR 850
    estimatedDays: 10,
  },
};

// Map ISO Alpha-2 country code to EMS UPU Zone
export const COUNTRY_EMS_ZONES: Record<string, number> = {
  // Zone 1: South Asia
  IN: 1,
  PK: 1,
  BD: 1,
  NP: 1,
  MV: 1,
  BT: 1,
  // Zone 2: Southeast Asia
  SG: 2,
  MY: 2,
  TH: 2,
  PH: 2,
  VN: 2,
  ID: 2,
  MM: 2,
  KH: 2,
  LA: 2,
  BN: 2,
  // Zone 3: East Asia & Middle East
  CN: 3,
  JP: 3,
  KR: 3,
  HK: 3,
  TW: 3,
  AE: 3,
  SA: 3,
  QA: 3,
  KW: 3,
  OM: 3,
  BH: 3,
  JO: 3,
  YE: 3,
  IQ: 3,
  IR: 3,
  // Zone 4: Europe
  GB: 4,
  DE: 4,
  FR: 4,
  IT: 4,
  NL: 4,
  SE: 4,
  NO: 4,
  CH: 4,
  AT: 4,
  ES: 4,
  PL: 4,
  BE: 4,
  DK: 4,
  FI: 4,
  IE: 4,
  PT: 4,
  GR: 4,
  CZ: 4,
  HU: 4,
  RO: 4,
  BG: 4,
  HR: 4,
  RS: 4,
  SK: 4,
  SI: 4,
  LT: 4,
  LV: 4,
  EE: 4,
  CY: 4,
  MT: 4,
  LU: 4,
  IS: 4,
  LI: 4,
  MK: 4,
  BA: 4,
  AL: 4,
  ME: 4,
  XK: 4,
  MD: 4,
  UA: 4,
  BY: 4,
  GE: 4,
  AM: 4,
  AZ: 4,
  // Zone 5: Americas
  US: 5,
  CA: 5,
  MX: 5,
  BR: 5,
  AR: 5,
  CL: 5,
  CO: 5,
  PE: 5,
  VE: 5,
  EC: 5,
  BO: 5,
  PY: 5,
  UY: 5,
  CR: 5,
  PA: 5,
  GT: 5,
  HN: 5,
  SV: 5,
  NI: 5,
  JM: 5,
  TT: 5,
  BB: 5,
  GD: 5,
  LC: 5,
  VC: 5,
  AG: 5,
  DM: 5,
  BS: 5,
  HT: 5,
  CU: 5,
  DO: 5,
};

export function normalizeCountryToCode(country: string): string {
  const norm = (country || "").trim().toUpperCase();
  if (norm === "LK" || norm === "SRI LANKA" || norm === "SRILANKA" || norm === "LKA") {
    return "LK";
  }
  if (norm.length === 2) {
    return norm;
  }
  const NAME_TO_ISO: Record<string, string> = {
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    USA: "US",
    "UNITED KINGDOM": "GB",
    "GREAT BRITAIN": "GB",
    UK: "GB",
    INDIA: "IN",
    SINGAPORE: "SG",
    AUSTRALIA: "AU",
    CANADA: "CA",
    GERMANY: "DE",
    FRANCE: "FR",
    ITALY: "IT",
    JAPAN: "JP",
    CHINA: "CN",
    "UNITED ARAB EMIRATES": "AE",
    "SAUDI ARABIA": "SA",
    MALAYSIA: "MY",
    THAILAND: "TH",
    "NEW ZEALAND": "NZ",
    SEYCHELLES: "SC",
    "SOUTH AFRICA": "ZA",
    PAKISTAN: "PK",
    BANGLADESH: "BD",
    MALDIVES: "MV",
    NEPAL: "NP",
  };
  return NAME_TO_ISO[norm] || norm;
}

export function isDomesticCountry(country: string): boolean {
  return normalizeCountryToCode(country) === "LK";
}

export function getEMSServiceZone(countryInput: string): EMSTariffZone {
  const code = normalizeCountryToCode(countryInput);
  const zoneNumber = COUNTRY_EMS_ZONES[code] ?? 6;
  return EMS_ZONE_TARIFFS[zoneNumber];
}

export function calculateDomesticParcelFee(weightGrams: number): number {
  const weight = Math.max(1, weightGrams);
  const tier = DOMESTIC_PARCEL_TIERS.find((t) => weight <= t.maxWeightGrams);
  if (tier) {
    return tier.amountCents;
  }
  // Above 30kg: 4,915 LKR base + 200 LKR per extra kg
  const maxTierCents = 491500;
  const extraKg = Math.ceil((weight - 30000) / 1000);
  return maxTierCents + extraKg * 20000;
}

export function calculateEMSParcelFee(
  weightGrams: number,
  countryCode: string,
): { amountCents: number; zone: EMSTariffZone } {
  const zone = getEMSServiceZone(countryCode);
  const weight = Math.max(1, weightGrams);

  if (weight <= 500) {
    return { amountCents: zone.baseAmountCents, zone };
  }

  const extra500gUnits = Math.ceil((weight - 500) / 500);
  const amountCents = zone.baseAmountCents + extra500gUnits * zone.perAdditional500gCents;
  return { amountCents, zone };
}
