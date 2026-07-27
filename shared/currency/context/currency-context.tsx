"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  formatMoney,
  convertMoney,
} from "@/shared/currency";

interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  ratesMap: Record<string, number>;
  format: (amountInSubunits: number, fromCurrency?: string) => string;
  convert: (amountInSubunits: number, fromCurrency: string) => number;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = "dilnova_selected_currency";
const COOKIE_KEY = "dilnova_currency";

export function CurrencyProvider({
  children,
  initialRatesMap = {},
}: {
  children: React.ReactNode;
  initialRatesMap?: Record<string, number>;
}) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [ratesMap] = useState<Record<string, number>>(initialRatesMap);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore saved currency from localStorage or Cookie
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
        setSelectedCurrencyState(saved);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedCurrency = useCallback((currency: string) => {
    const code = currency.toUpperCase();
    setSelectedCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
      document.cookie = `${COOKIE_KEY}=${code}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }
  }, []);

  const convert = useCallback(
    (amountInSubunits: number, fromCurrency: string = DEFAULT_CURRENCY): number => {
      return convertMoney({
        amountInSubunits,
        fromCurrency,
        toCurrency: selectedCurrency,
        ratesMap,
      });
    },
    [selectedCurrency, ratesMap],
  );

  const format = useCallback(
    (amountInSubunits: number, fromCurrency: string = DEFAULT_CURRENCY): string => {
      const convertedSubunits = convert(amountInSubunits, fromCurrency);
      return formatMoney(convertedSubunits, selectedCurrency);
    },
    [convert, selectedCurrency],
  );

  const value = useMemo(
    () => ({
      selectedCurrency,
      setSelectedCurrency,
      ratesMap,
      format,
      convert,
      isLoading,
    }),
    [selectedCurrency, setSelectedCurrency, ratesMap, format, convert, isLoading],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}
