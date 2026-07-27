import { getCurrencyExponent, DEFAULT_CURRENCY } from "./config";

export * from "./config";

/**
 * Converts a major currency unit (e.g. 10.50 USD) to integer sub-units / cents (e.g. 1050).
 * Respects 0-decimal currencies (e.g. 1500 JPY -> 1500).
 */
export function toSubunits(amountInUnits: number, currency: string = DEFAULT_CURRENCY): number {
  const exponent = getCurrencyExponent(currency);
  const factor = Math.pow(10, exponent);
  return Math.round(amountInUnits * factor);
}

/**
 * Converts integer sub-units / cents (e.g. 1050) to major currency unit (e.g. 10.50).
 */
export function toUnits(amountInSubunits: number, currency: string = DEFAULT_CURRENCY): number {
  const exponent = getCurrencyExponent(currency);
  const factor = Math.pow(10, exponent);
  return amountInSubunits / factor;
}

/**
 * Formats integer sub-units / cents into a localized currency string.
 * Example:
 * - formatMoney(1050, "USD") => "$10.50"
 * - formatMoney(1500, "JPY") => "¥1,500"
 * - formatMoney(350000, "LKR") => "LKR 3,500.00" or "Rs 3,500.00"
 */
export function formatMoney(
  amountInSubunits: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = "en-US",
): string {
  const code = currency.toUpperCase();
  const exponent = getCurrencyExponent(code);
  const units = toUnits(amountInSubunits, code);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(units);
  } catch {
    // Fallback if locale/currency formatting fails
    return `${code} ${units.toFixed(exponent)}`;
  }
}

/**
 * Converts sub-units from one currency to another using an exchange rates map.
 * Optional fxMarkupPercent adds a conversion buffer (e.g. 1.5%).
 *
 * ratesMap format expected:
 * { "USD_LKR": 307.69, "LKR_USD": 0.00325, "USD_EUR": 0.92, ... }
 * or simple target rate when converting via base currency.
 */
export function convertMoney({
  amountInSubunits,
  fromCurrency,
  toCurrency,
  ratesMap,
  fxMarkupPercent = 0,
}: {
  amountInSubunits: number;
  fromCurrency: string;
  toCurrency: string;
  ratesMap: Record<string, number>;
  fxMarkupPercent?: number;
}): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return amountInSubunits;
  }

  // 1. Check direct conversion pair (e.g. "LKR_USD")
  let rate = ratesMap[`${from}_${to}`];

  // 2. If direct pair missing, check inverse rate (e.g. 1 / "USD_LKR")
  if (!rate && ratesMap[`${to}_${from}`]) {
    const inverse = ratesMap[`${to}_${from}`];
    if (inverse > 0) {
      rate = 1 / inverse;
    }
  }

  // 3. If pair missing, try converting through USD base currency as pivot
  if (!rate && from !== DEFAULT_CURRENCY && to !== DEFAULT_CURRENCY) {
    const fromToUsd =
      ratesMap[`${from}_${DEFAULT_CURRENCY}`] ??
      (ratesMap[`${DEFAULT_CURRENCY}_${from}`]
        ? 1 / ratesMap[`${DEFAULT_CURRENCY}_${from}`]
        : null);
    const usdToTarget =
      ratesMap[`${DEFAULT_CURRENCY}_${to}`] ??
      (ratesMap[`${to}_${DEFAULT_CURRENCY}`] ? 1 / ratesMap[`${to}_${DEFAULT_CURRENCY}`] : null);

    if (fromToUsd && usdToTarget) {
      rate = fromToUsd * usdToTarget;
    }
  }

  // Fallback to 1:1 if rate cannot be resolved
  if (!rate || isNaN(rate)) {
    rate = 1;
  }

  // Convert major units to major units accounting for exponent differences
  const fromUnits = toUnits(amountInSubunits, from);
  const markupFactor = 1 + Math.max(0, fxMarkupPercent) / 100;
  const convertedUnits = fromUnits * rate * markupFactor;

  return toSubunits(convertedUnits, to);
}
