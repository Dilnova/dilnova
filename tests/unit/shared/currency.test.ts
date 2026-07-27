import { describe, expect, it } from "vitest";
import {
  toSubunits,
  toUnits,
  formatMoney,
  convertMoney,
  getCurrencyExponent,
} from "@/shared/currency";

describe("shared/currency", () => {
  describe("getCurrencyExponent", () => {
    it("returns 0 for JPY and KRW", () => {
      expect(getCurrencyExponent("JPY")).toBe(0);
      expect(getCurrencyExponent("KRW")).toBe(0);
    });

    it("returns 2 for USD, EUR, and LKR", () => {
      expect(getCurrencyExponent("USD")).toBe(2);
      expect(getCurrencyExponent("EUR")).toBe(2);
      expect(getCurrencyExponent("LKR")).toBe(2);
    });

    it("returns 3 for BHD and KWD", () => {
      expect(getCurrencyExponent("BHD")).toBe(3);
      expect(getCurrencyExponent("KWD")).toBe(3);
    });
  });

  describe("toSubunits and toUnits", () => {
    it("converts units to subunits accurately for 2-decimal currency", () => {
      expect(toSubunits(10.5, "USD")).toBe(1050);
      expect(toUnits(1050, "USD")).toBe(10.5);
    });

    it("converts units to subunits accurately for 0-decimal currency", () => {
      expect(toSubunits(1500, "JPY")).toBe(1500);
      expect(toUnits(1500, "JPY")).toBe(1500);
    });

    it("converts units to subunits accurately for 3-decimal currency", () => {
      expect(toSubunits(1.234, "BHD")).toBe(1234);
      expect(toUnits(1234, "BHD")).toBe(1.234);
    });
  });

  describe("formatMoney", () => {
    it("formats 2-decimal currencies correctly", () => {
      const formattedUSD = formatMoney(1050, "USD");
      expect(formattedUSD).toContain("10.50");

      const formattedLKR = formatMoney(350000, "LKR");
      expect(formattedLKR).toContain("3,500.00");
    });

    it("formats 0-decimal currencies correctly", () => {
      const formattedJPY = formatMoney(1500, "JPY");
      expect(formattedJPY).toContain("1,500");
      expect(formattedJPY).not.toContain(".00");
    });
  });

  describe("convertMoney", () => {
    const ratesMap = {
      LKR_USD: 0.00325,
      USD_LKR: 307.69,
      USD_EUR: 0.92,
      EUR_USD: 1.087,
    };

    it("returns same amount when from and to currencies match", () => {
      expect(
        convertMoney({
          amountInSubunits: 1000,
          fromCurrency: "USD",
          toCurrency: "USD",
          ratesMap,
        }),
      ).toBe(1000);
    });

    it("converts LKR to USD accurately", () => {
      // 3,500 LKR = 350000 subunits
      // 3,500 * 0.00325 = $11.375 -> rounded to $11.38 -> 1138 subunits
      const result = convertMoney({
        amountInSubunits: 350000,
        fromCurrency: "LKR",
        toCurrency: "USD",
        ratesMap,
      });

      expect(result).toBe(1138);
    });

    it("applies FX markup buffer correctly", () => {
      // 3,500 LKR * 0.00325 * (1 + 0.015) = $11.5456 -> $11.55 -> 1155 subunits
      const resultWithMarkup = convertMoney({
        amountInSubunits: 350000,
        fromCurrency: "LKR",
        toCurrency: "USD",
        ratesMap,
        fxMarkupPercent: 1.5,
      });

      expect(resultWithMarkup).toBe(1155);
    });

    it("converts via inverse rate when direct pair missing", () => {
      const sparseRatesMap = {
        USD_LKR: 307.69,
      };

      // 3,500 LKR / 307.69 = $11.375 -> $11.38 -> 1138 subunits
      const result = convertMoney({
        amountInSubunits: 350000,
        fromCurrency: "LKR",
        toCurrency: "USD",
        ratesMap: sparseRatesMap,
      });

      expect(result).toBe(1138);
    });

    it("converts between zero-decimal and two-decimal currencies", () => {
      const jpyRatesMap = {
        USD_JPY: 155.0,
      };

      // $10.00 (1000 USD subunits) * 155.0 = 1550 JPY (1550 subunits in 0-decimal JPY)
      const result = convertMoney({
        amountInSubunits: 1000,
        fromCurrency: "USD",
        toCurrency: "JPY",
        ratesMap: jpyRatesMap,
      });

      expect(result).toBe(1550);
    });
  });
});
