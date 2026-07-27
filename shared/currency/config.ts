/**
 * Multi-Currency Configuration & Decimal Exponent Registry
 */

export const DEFAULT_CURRENCY = "LKR";

/**
 * Currency exponents (number of decimal places) according to ISO 4217.
 * - 0 decimals: JPY, KRW, VND, UGX
 * - 2 decimals: USD, EUR, GBP, LKR, AUD, CAD, INR, SGD, etc.
 * - 3 decimals: BHD, KWD, OMR
 */
export const CURRENCY_EXPONENTS: Record<string, number> = {
  // 0 decimals
  JPY: 0,
  KRW: 0,
  VND: 0,
  UGX: 0,
  PYG: 0,
  CLP: 0,

  // 3 decimals
  BHD: 3,
  KWD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,

  // Default to 2 for standard currencies (USD, EUR, GBP, LKR, etc.)
};

/**
 * Returns the decimal exponent for a given currency code. Defaults to 2.
 */
export function getCurrencyExponent(currencyCode: string): number {
  const code = currencyCode.toUpperCase();
  return CURRENCY_EXPONENTS[code] ?? 2;
}

/**
 * Supported currencies in Dilnova Commerce Hub platform.
 */
export const SUPPORTED_CURRENCIES = [
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];
