import { db } from "@/shared/db/client";
import { exchangeRates, orgSettings } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CURRENCY } from "./config";

/**
 * Fallback static rate matrix relative to USD (1 USD = X Target Currency)
 * Updated automatically via background sync.
 */
export const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1.0,
  LKR: 307.69,
  EUR: 0.92,
  GBP: 0.78,
  AUD: 1.52,
  CAD: 1.38,
  JPY: 155.0,
  INR: 83.5,
  SGD: 1.35,
  AED: 3.67,
};

/**
 * Retrieves exchange rate pairs map from DB, auto-seeding defaults if DB is empty.
 * Returns map formatted as: { "USD_LKR": 307.69, "LKR_USD": 0.00325, ... }
 */
export async function getExchangeRatesMap(): Promise<Record<string, number>> {
  try {
    const rates = await db.select().from(exchangeRates);

    if (!rates || rates.length === 0) {
      await seedDefaultExchangeRates();
      return buildRatesMapFromUsdDefaults();
    }

    const ratesMap: Record<string, number> = {};
    for (const r of rates) {
      const key = `${r.fromCurrency.toUpperCase()}_${r.toCurrency.toUpperCase()}`;
      ratesMap[key] = r.rate;
    }

    return ratesMap;
  } catch (error) {
    console.error("Failed to load exchange rates from database, using fallback rates:", error);
    return buildRatesMapFromUsdDefaults();
  }
}

/**
 * Gets an organization's base currency and FX markup settings.
 */
export async function getOrgCurrencySettings(orgId: string): Promise<{
  baseCurrency: string;
  fxMarkupPercent: number;
}> {
  if (!orgId) {
    return { baseCurrency: DEFAULT_CURRENCY, fxMarkupPercent: 0 };
  }

  try {
    const [settings] = await db
      .select()
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1);

    if (!settings) {
      return { baseCurrency: DEFAULT_CURRENCY, fxMarkupPercent: 0 };
    }

    return {
      baseCurrency: settings.baseCurrency.toUpperCase(),
      fxMarkupPercent: settings.fxMarkupPercent ?? 0,
    };
  } catch (error) {
    console.error(`Failed to load org currency settings for orgId ${orgId}:`, error);
    return { baseCurrency: DEFAULT_CURRENCY, fxMarkupPercent: 0 };
  }
}

/**
 * Builds full pair conversion matrix from USD base rate table.
 */
function buildRatesMapFromUsdDefaults(): Record<string, number> {
  const map: Record<string, number> = {};
  const currencies = Object.keys(DEFAULT_USD_RATES);

  for (const from of currencies) {
    for (const to of currencies) {
      if (from === to) {
        map[`${from}_${to}`] = 1.0;
        continue;
      }

      const fromUsdRate = DEFAULT_USD_RATES[from];
      const toUsdRate = DEFAULT_USD_RATES[to];

      if (fromUsdRate && toUsdRate) {
        // from -> USD -> to
        const rate = (1 / fromUsdRate) * toUsdRate;
        map[`${from}_${to}`] = rate;
      }
    }
  }

  return map;
}

/**
 * Seeds initial rates into exchange_rates table.
 */
export async function seedDefaultExchangeRates(): Promise<void> {
  const fullMap = buildRatesMapFromUsdDefaults();
  const recordsToInsert = Object.entries(fullMap).map(([pair, rate]) => {
    const [fromCurrency, toCurrency] = pair.split("_");
    return {
      fromCurrency,
      toCurrency,
      rate,
      provider: "fallback_default",
      updatedAt: new Date(),
    };
  });

  try {
    // Delete existing and insert fresh matrix
    await db.delete(exchangeRates);
    await db.insert(exchangeRates).values(recordsToInsert);
  } catch (error) {
    console.error("Error seeding default exchange rates:", error);
  }
}

/**
 * Fetches latest exchange rates from open API provider (e.g. exchangerate-api) and syncs to DB.
 */
export async function syncLiveExchangeRates(): Promise<{ success: boolean; updatedCount: number }> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`FX API responded with status ${response.status}`);
    }

    const data = (await response.json()) as { rates?: Record<string, number> };
    if (!data.rates || typeof data.rates !== "object") {
      throw new Error("Invalid FX API response structure");
    }

    const fetchedRates = data.rates;
    const currencies = Object.keys(DEFAULT_USD_RATES);
    const usdBaseRates: Record<string, number> = {};

    for (const curr of currencies) {
      usdBaseRates[curr] = fetchedRates[curr] ?? DEFAULT_USD_RATES[curr];
    }

    // Build full matrix
    const fullMap: Record<string, number> = {};
    for (const from of currencies) {
      for (const to of currencies) {
        if (from === to) {
          fullMap[`${from}_${to}`] = 1.0;
          continue;
        }

        const fromUsdRate = usdBaseRates[from];
        const toUsdRate = usdBaseRates[to];

        if (fromUsdRate && toUsdRate) {
          fullMap[`${from}_${to}`] = (1 / fromUsdRate) * toUsdRate;
        }
      }
    }

    const records = Object.entries(fullMap).map(([pair, rate]) => {
      const [fromCurrency, toCurrency] = pair.split("_");
      return {
        fromCurrency,
        toCurrency,
        rate,
        provider: "open.er-api.com",
        updatedAt: new Date(),
      };
    });

    await db.delete(exchangeRates);
    await db.insert(exchangeRates).values(records);

    return { success: true, updatedCount: records.length };
  } catch (error) {
    console.error("Failed to sync live exchange rates, falling back to defaults:", error);
    await seedDefaultExchangeRates();
    return { success: false, updatedCount: 0 };
  }
}
